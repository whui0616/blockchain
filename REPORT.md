# 이더리움 역사적 해킹 시뮬레이션 과제 보고서

## 1. 소스코드

- DAO 취약 컨트랙트  
  - `contracts/DAOScenario.sol` - `SimpleDAOVulnerable`

- DAO 공격 컨트랙트  
  - `contracts/DAOScenario.sol` - `DAOAttacker`

- DAO 수정 컨트랙트 3개  
  - `contracts/DAOScenario.sol` - `SimpleDAOFixedCEI`  
  - `contracts/DAOScenario.sol` - `SimpleDAOFixedGuard`  
  - `contracts/DAOScenario.sol` - `SimpleDAOPullOverPush`

- Parity #1 취약 컨트랙트  
  - `contracts/ParityScenario.sol` - `WalletLibraryVulnerable`, `WalletProxy`

- Parity #1 공격 스크립트  
  - `scripts/parity-init-hijack.js`

- Parity #1 수정 컨트랙트  
  - `contracts/ParityScenario.sol` - `WalletLibraryFixed`

- Parity #2 취약 컨트랙트  
  - `contracts/ParityScenario.sol` - `WalletLibraryVulnerable` (`kill()` 공개 호출)

- Parity #2 공격 스크립트  
  - `scripts/parity-selfdestruct.js`

- Parity #2 수정 컨트랙트  
  - `contracts/ParityScenario.sol` - `WalletLibraryFixed` (접근제어 + selfdestruct 제거)

## 2. 실행 스크립트

- deploy script  
  - `scripts/deploy.js`  
  - 실행: `npm run deploy`

- attack script  
  - `scripts/dao-attack.js`  
  - `scripts/parity-init-hijack.js`  
  - `scripts/parity-selfdestruct.js`  
  - 전체 실행: `npm run attack:all`

- test script  
  - `test/assignment.test.js`  
  - 실행: `npm test`

## 3. 트랜잭션 로그

### 3-1. DAO 해킹 (Reentrancy)

- 공격 전 잔액  
  - Vulnerable DAO balance before: `10.0 ETH`

- 공격 실행 후 잔액  
  - Vulnerable DAO balance after: `0.0 ETH`  
  - Attacker contract balance: `11.0 ETH`

- owner 변경 여부  
  - 해당 시나리오는 owner 기반 공격이 아니라 잔액 드레인 공격이므로 owner 변경 항목 없음

- 함수 호출 성공/실패 로그  
  - 취약 컨트랙트 공격: 성공  
  - CEI 수정 버전 공격: 실패(차단)  
  - Reentrancy Guard 수정 버전 공격: 실패(차단)  
  - Pull-over-push 수정 버전 출금 플로우: 정상 동작

### 3-2. Parity #1 (Unauthorized Initialization)

- 공격 전 잔액  
  - wallet2: `3 ETH`  
  - wallet3: `2 ETH` (공격 스크립트에서 입금 후 공격 수행)

- 공격 실행 후 잔액  
  - wallet2 delta: `-3.0 ETH`  
  - wallet3 delta: `-2.0 ETH`

- owner 변경 여부  
  - 취약 버전: wallet2, wallet3 owner가 공격자로 변경됨 (`initWallet()` 악용)  
  - 수정 버전: 재초기화 시도 시 owner 변경 실패

- 함수 호출 성공/실패 로그  
  - 취약 버전 `initWallet()`(공격자): 성공  
  - 취약 버전 `execute()`(공격자): 성공  
  - 수정 버전 `initWallet()` 재호출: 실패(`already initialized`)

### 3-3. Parity #2 (Library Self-Destruct)

- 공격 전 잔액  
  - walletA, walletB, walletC 각 `2 ETH` 입금

- 공격 실행 후 잔액  
  - 라이브러리 파괴 이후 인출 시도 시  
    - recipient delta: `0.0 ETH`  
    - walletA delta: `0.0 ETH`

- owner 변경 여부  
  - 본 시나리오는 owner 탈취가 아니라 공용 라이브러리 파괴로 인한 기능 마비 공격

- 함수 호출 성공/실패 로그  
  - 라이브러리 `kill()` 호출: 성공  
  - 이후 프록시 지갑 `execute()`로 송금 시도: 실질 송금 실패(잔액 이동 없음)  
  - 결과: 자금 동결(frozen)

## 4. 보고서

### 4-1. DAO 해킹

- 각 해킹 원리 설명  
  - `withdraw()`에서 상태값 차감 전에 외부 호출(`call`)을 수행하면, 공격자 fallback에서 `withdraw()`를 재진입 호출할 수 있다.

- 취약점이 생긴 이유  
  - Checks-Effects-Interactions 순서 미준수  
  - 재진입 방지 락 미구현  
  - 즉시 송금(push) 방식 사용

- 공격 과정  
  1) 피해자들이 DAO에 ETH 입금  
  2) 공격자가 소량 입금 후 `attack()` 호출  
  3) fallback에서 `withdraw()` 재귀 호출  
  4) DAO 잔액이 반복적으로 빠져나감

- 실행 결과  
  - DAO 잔액 `10 ETH -> 0 ETH`

- 수정 방법  
  - CEI 적용 (`SimpleDAOFixedCEI`)  
  - Reentrancy Guard 적용 (`SimpleDAOFixedGuard`)  
  - Pull-over-push 방식 전환 (`SimpleDAOPullOverPush`)

- 수정 후 공격이 막히는지 확인  
  - CEI, Guard 버전 모두 공격 트랜잭션 revert  
  - Pull-over-push는 재진입 경로 자체가 제거되어 공격 불가

### 4-2. Parity Hack #1 (Unauthorized Initialization)

- 각 해킹 원리 설명  
  - 프록시가 라이브러리로 `delegatecall`할 때, 초기화 함수 보호가 없으면 누구나 owner를 덮어쓸 수 있다.

- 취약점이 생긴 이유  
  - `initWallet()` 재호출 제한 없음  
  - owner 설정 권한 검증 부재

- 공격 과정  
  1) 취약 라이브러리 + 프록시 지갑 배포  
  2) 공격자가 미초기화 지갑에 `initWallet()` 호출  
  3) owner 탈취 후 `execute()` 호출로 자금 인출

- 실행 결과  
  - wallet2, wallet3 owner가 공격자로 변경  
  - wallet2 `-3 ETH`, wallet3 `-2 ETH` 유출

- 수정 방법  
  - `initialized` 플래그 도입 후 1회 초기화만 허용  
  - owner 권한 검사 유지

- 수정 후 공격이 막히는지 확인  
  - 수정 버전 재초기화 시도 시 `already initialized`로 revert

### 4-3. Parity Hack #2 (Library Self-Destruct)

- 각 해킹 원리 설명  
  - 여러 지갑이 공용 라이브러리를 참조할 때, 라이브러리 파괴 시 모든 프록시 지갑의 핵심 로직이 사라진다.

- 취약점이 생긴 이유  
  - 파괴 함수(`kill`) 공개 노출  
  - 접근제어 미흡  
  - 공용 라이브러리 단일 실패지점(SPOF)

- 공격 과정  
  1) 취약 라이브러리와 다수 프록시 지갑 배포  
  2) 지갑 초기화 및 자금 예치  
  3) 공격자가 라이브러리 `kill()` 호출  
  4) 이후 지갑 함수 호출 불능 상태 유도

- 실행 결과  
  - 인출 시도 후에도 잔액 이동 없음  
  - 자금이 도난이 아니라 동결(frozen)됨

- 수정 방법  
  - 파괴 함수 제거  
  - 관리자/소유자 접근제어 적용

- 수정 후 공격이 막히는지 확인  
  - 수정 버전에는 공개 파괴 경로가 없어 동일 공격 재현 불가
