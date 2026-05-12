# 스마트 컨트랙트 해킹 시뮬레이션 보고서

본 과제는 로컬 Hardhat 환경에서만 실행한 교육용 시뮬레이션이다.  
실제 메인넷/테스트넷 배포 및 악용을 목적으로 하지 않는다.

---

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
  - `contracts/ParityScenario.sol` - `WalletLibraryVulnerable` (`kill()` 공개)

- Parity #2 공격 스크립트
  - `scripts/parity-selfdestruct.js`

- Parity #2 수정 컨트랙트
  - `contracts/ParityScenario.sol` - `WalletLibraryFixed` (접근제어 + selfdestruct 제거)

---

## 2. 실행 스크립트

- deploy script
  - `scripts/deploy.js`
  - 실행 명령: `npm run deploy`

- attack script
  - `scripts/dao-attack.js`
  - `scripts/parity-init-hijack.js`
  - `scripts/parity-selfdestruct.js`
  - 전체 실행: `npm run attack:all`

- test script
  - `test/assignment.test.js`
  - 실행 명령: `npm test`

### 실행 순서

```bash
npm install
npm run compile
npm run deploy
npm run dao:attack
npm run parity:init-hijack
npm run parity:selfdestruct
npm test
```

---

## 3. 트랜잭션 로그

아래 값은 스크립트 실행 시 콘솔에 출력되는 핵심 로그다.

### 3-1) DAO Reentrancy

- 공격 전 잔액
  - Vulnerable DAO balance before: `10.0 ETH`

- 공격 실행 후 잔액
  - Vulnerable DAO balance after: `0.0 ETH`
  - Attacker contract balance: `11.0 ETH`

- owner 변경 여부
  - 해당 시나리오는 owner 탈취가 아닌 재진입 기반 잔액 탈취이므로 owner 변경 없음

- 함수 호출 성공/실패 로그
  - 취약 컨트랙트 공격: 성공
  - CEI 수정 컨트랙트 공격: 실패(revert)
  - Reentrancy Guard 수정 컨트랙트 공격: 실패(revert)
  - Pull-over-push 수정 컨트랙트: 정상 출금 플로우 확인

### 3-2) Parity #1 (Unauthorized Initialization)

- 공격 전 잔액
  - wallet2: `3 ETH`
  - wallet3: `2 ETH`

- 공격 실행 후 잔액
  - wallet2 delta: `-3.0 ETH`
  - wallet3 delta: `-2.0 ETH`

- owner 변경 여부
  - 취약 버전: wallet2/3 owner가 공격자로 변경됨
  - 수정 버전: 재초기화가 차단되어 owner 변경 실패

- 함수 호출 성공/실패 로그
  - 취약 버전 `initWallet()`(공격자): 성공
  - 취약 버전 `execute()`(공격자): 성공
  - 수정 버전 `initWallet()` 재호출: 실패(`already initialized`)

### 3-3) Parity #2 (Library Self-Destruct)

- 공격 전 잔액
  - walletA, walletB, walletC 각각 `2 ETH` 입금

- 공격 실행 후 잔액
  - 라이브러리 파괴 후 송금 시도 결과
    - recipient delta: `0.0 ETH`
    - walletA delta: `0.0 ETH`

- owner 변경 여부
  - owner 탈취가 아니라 공용 라이브러리 파괴로 기능 마비 유도

- 함수 호출 성공/실패 로그
  - 취약 버전 `kill()` 호출: 성공
  - 이후 proxy `execute()` 호출: 실질 송금 실패(잔액 이동 없음)

---

## 4. 보고서

### 4-1) DAO 해킹 (Reentrancy)

- 각 해킹 원리 설명
  - `withdraw()`에서 외부 호출을 먼저 수행하면 fallback으로 재진입이 가능해 반복 인출이 발생한다.

- 취약점이 생긴 이유
  - CEI 순서 미준수
  - 재진입 방지 장치 부재
  - push 송금 구조 사용

- 공격 과정
  1. 피해자들이 DAO에 ETH를 예치
  2. 공격자가 seed ETH를 넣고 `attack()` 실행
  3. fallback에서 `withdraw()`를 재귀 호출
  4. 컨트랙트 잔액을 반복 인출

- 실행 결과
  - DAO 잔액 `10.0 ETH -> 0.0 ETH`

- 수정 방법
  - CEI 적용 (`SimpleDAOFixedCEI`)
  - Reentrancy Guard 적용 (`SimpleDAOFixedGuard`)
  - Pull-over-push 적용 (`SimpleDAOPullOverPush`)

- 수정 후 공격이 막히는지 확인
  - CEI/Guard는 공격 트랜잭션이 revert
  - Pull-over-push는 재진입 지점 자체가 제거됨

### 4-2) Parity #1 (Unauthorized Initialization)

- 각 해킹 원리 설명
  - delegatecall 프록시 구조에서 초기화 보호가 없으면 공격자가 owner를 덮어쓸 수 있다.

- 취약점이 생긴 이유
  - `initWallet()` 재호출 제한 미구현
  - 초기 owner 설정 권한 검증 부재

- 공격 과정
  1. 취약 라이브러리와 프록시 지갑 배포
  2. 공격자가 미초기화 지갑에 `initWallet()` 호출
  3. owner 권한 탈취 후 `execute()` 호출

- 실행 결과
  - wallet2/3 owner가 공격자로 변경
  - wallet2 `-3 ETH`, wallet3 `-2 ETH` 유출

- 수정 방법
  - `initialized` 플래그로 1회 초기화만 허용
  - owner 체크 유지

- 수정 후 공격이 막히는지 확인
  - 수정 버전에서 재초기화 시도 시 `already initialized`로 revert

### 4-3) Parity #2 (Library Self-Destruct)

- 각 해킹 원리 설명
  - 다수 프록시가 공유하는 라이브러리를 파괴하면 전체 지갑 기능이 마비된다.

- 취약점이 생긴 이유
  - 파괴 함수(`kill`) 공개
  - 접근제어 미구현
  - 공유 라이브러리 단일 실패 지점

- 공격 과정
  1. 취약 라이브러리 + 프록시 지갑들 배포
  2. 지갑 초기화 및 자금 예치
  3. 공격자가 라이브러리 `kill()` 호출
  4. 이후 지갑 함수 호출 불능 상태 확인

- 실행 결과
  - 송금 시도 후에도 잔액 이동 없음
  - 자금은 도난이 아니라 동결(frozen) 상태

- 수정 방법
  - 공개 파괴 함수 제거
  - 관리자 접근제어 적용

- 수정 후 공격이 막히는지 확인
  - 수정 버전에는 동일 파괴 경로가 없어 재현 불가
