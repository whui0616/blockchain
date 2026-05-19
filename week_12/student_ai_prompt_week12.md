# Week 12 학생용 AI 프롬프트

아래 프롬프트를 ChatGPT, Claude, Gemini, Codex 같은 AI 도구에 그대로 붙여 넣고 사용하세요.  
목표는 답을 외우는 것이 아니라, AI와 함께 로컬 Hardhat 환경에서 DAO Hack과 Parity Wallet Hack을 직접 재현하고, 취약점과 수정 방법을 코드와 로그로 확인하는 것입니다.

```text
너는 이더리움 스마트 컨트랙트 보안 실습을 도와주는 Solidity/Hardhat 튜터이자 개발자다.

내 목표는 "Historic Ethereum Smart Contract Hacks" 과제를 로컬 환경에서 완성하는 것이다.
반드시 로컬 Hardhat in-memory network에서만 실행해야 하며, 실제 메인넷, 테스트넷, RPC URL, 개인키, 지갑 연결, 배포는 절대 사용하지 않는다.

과제 주제:
1. DAO Hack, 2016: Reentrancy
2. Parity Wallet Hack #1, 2017: Unauthorized Initialization
3. Parity Wallet Hack #2, 2017: Library Self-Destruct

최종 산출물:
- Solidity 취약 컨트랙트
- Solidity 수정 컨트랙트
- 공격/재현 스크립트
- 실행 로그
- delegatecall storage collision 설명 또는 다이어그램
- 각 취약점의 원인, 공격 흐름, 수정 원리 설명
- `npm test` 또는 동등한 명령으로 전체 실습이 한 번에 실행되는 구조

프로젝트는 가능하면 아래 구조로 만들어라.

week_12/
  contracts/
    dao/
      SimpleDAO.sol
      DAOAttacker.sol
      SimpleDAO_CEI.sol
      SimpleDAO_Guard.sol
      SimpleDAO_PullPayment.sol
    parity1/
      WalletLibraryVulnerable.sol
      WalletVulnerable.sol
      WalletFixed.sol
    parity2/
      SharedWalletLibraryVulnerable.sol
      SharedWallet.sol
      SharedWalletLibraryFixed.sol
  scripts/
    01_dao_attack.js
    02_dao_fixes.js
    03_parity1_attack.js
    04_parity2_freeze.js
    lib.js
  logs/
    dao_attack.log
    dao_fixes.log
    parity1_attack.log
    parity2_freeze.log
  diagrams/
    delegatecall_storage_collision.md
  hardhat.config.js
  package.json
  README.md

실습 요구사항 1: DAO Hack / Reentrancy
- `SimpleDAO`를 만든다.
- 피해자가 10 ETH를 예치하게 한다.
- 공격자는 1 ETH를 예치한 뒤 `withdraw()`를 재귀적으로 호출하는 `DAOAttacker`를 만든다.
- 취약한 `withdraw()`는 외부 call로 ETH를 먼저 보내고, 그 다음에 내부 balance를 줄이는 구조여야 한다.
- Solidity 0.8.x에서는 underflow가 자동 revert되므로, 역사적 DAO 재진입 재현용 `SimpleDAO`에서는 공격 트랜잭션이 revert되지 않도록 balance 감소 부분을 `unchecked`로 처리하거나 동등한 방식으로 pre-0.8 동작을 재현하라. 이 처리는 취약점 재현용 컨트랙트에만 사용하고, 수정 컨트랙트에는 사용하지 않는다.
- 공격 결과 DAO 잔액이 0 ETH가 되고, 공격 컨트랙트가 피해자 10 ETH와 자기 seed 1 ETH를 포함해 11 ETH를 보유하는 로그를 남겨라.
- 취약 원인을 "external interaction before state update" 관점에서 설명하라.
- 단, 이 실습은 역사적 취약점 재현용이므로 로컬 네트워크에서만 실행한다.

DAO 수정 요구사항:
1. Checks-Effects-Interactions 버전
   - balance를 먼저 줄이고 나중에 ETH를 전송한다.
2. Reentrancy guard 버전
   - `nonReentrant` 방식으로 재진입을 막는다.
3. Pull-over-push 버전
   - `withdraw()` 중 ETH를 즉시 push하지 말고 pending payment로 기록한 뒤, 사용자가 별도 `claimPayment()`로 가져가게 한다.

각 수정 버전에 대해 공격 시도가 실패하거나 drain이 불가능함을 로그와 assertion으로 보여라.
Pull-over-push의 경우 공격자에게 ETH가 push되지 않고, 정상 사용자는 pending payment를 claim할 수 있음을 보여라.

실습 요구사항 2: Parity Hack #1 / Unauthorized Initialization
- 하나의 `WalletLibraryVulnerable`을 배포한다.
- 세 개의 `WalletVulnerable` proxy wallet을 배포하고 각 wallet에 5 ETH를 넣는다.
- Wallet 1은 정상 owner가 `initWallet()`을 호출해 초기화하고, owner가 1 ETH를 정상 출금하는 흐름을 보여라.
- Wallet 2와 Wallet 3은 초기화되지 않은 상태로 둔다.
- 공격자가 proxy fallback을 통해 library의 `initWallet()`을 delegatecall로 호출해서 각 proxy storage의 owner가 되게 한다.
- 공격자가 Wallet 2와 Wallet 3의 ETH를 drain하는 로그를 남겨라.
- 핵심 설명:
  - delegatecall은 library의 코드만 빌려 쓰고 storage는 proxy의 storage를 쓴다.
  - unprotected initWallet 때문에 공격자가 proxy storage의 owner slot을 자기 주소로 바꿀 수 있다.
- 수정 버전 `WalletFixed`를 만들어라.
  - constructor 또는 initialized flag로 owner 초기화를 보호한다.
  - 재초기화는 `already initialized`로 실패해야 한다.
  - owner가 아닌 공격자의 execute는 `owner only`로 실패해야 한다.
- `diagrams/delegatecall_storage_collision.md`에 delegatecall storage collision 구조를 텍스트 다이어그램으로 설명하라.

실습 요구사항 3: Parity Hack #2 / Library Self-Destruct
- 하나의 `SharedWalletLibraryVulnerable`을 배포한다.
- 세 개의 `SharedWallet` proxy wallet을 배포하고 모두 같은 library 주소를 바라보게 한다.
- 각 wallet을 정상 owner로 초기화하고 5 ETH씩 넣는다.
- 공격자가 library contract 자체에 직접 `initWallet()`을 호출해서 library 자체 storage의 owner가 되게 한다.
- 공격자가 library의 public `killLibrary()` 또는 동등한 selfdestruct 함수를 호출한다.
- 역사적 재현을 위해 Hardhat/컴파일 설정에서 SELFDESTRUCT가 실제로 code removal처럼 관찰되도록 pre-Cancun 계열 hardfork/evmVersion을 사용하라. 예: compiler evmVersion `paris`, Hardhat network hardfork `merge`.
- library code bytes가 selfdestruct 전에는 0보다 크고, 후에는 0이 되는 로그를 남겨라.
- 이후 각 wallet의 정상 owner가 execute를 시도해도 delegatecall target code가 없어 실패하는 것을 보여라.
- 중요한 설명:
  - Parity #2는 공격자가 wallet의 ETH를 훔친 사건으로 설명하면 안 된다.
  - 각 wallet의 ETH는 wallet에 남아 있지만, 공유 library code가 사라져 기능 호출이 불가능해져 "frozen funds" 상태가 된다.
- 수정 버전 `SharedWalletLibraryFixed`를 만들어라.
  - library 자체가 직접 초기화되지 못하게 한다.
  - 이때 library 자체 storage만 잠가야 하며, proxy wallet이 delegatecall로 자기 storage를 초기화하는 정상 흐름까지 막으면 안 된다.
  - public selfdestruct/kill 함수를 제거한다.
  - fixed library를 쓰는 wallet은 정상 owner가 계속 사용할 수 있어야 한다.

실행 명령:
- `npm install`
- `npm test`

권장 개발 환경:
- Hardhat 3.x와 ethers 6.x를 기준으로 작성하라.
- JavaScript는 ESM 방식, 즉 `package.json`에 `"type": "module"`을 두고 `import` 문법을 사용하라.
- 다른 버전 조합을 쓰더라도 Hardhat, ethers, config, script 문법을 한 조합으로 일관되게 맞춰라.

`package.json`에는 최소한 다음과 같은 실행 흐름을 넣어라.
- `compile`: hardhat compile
- `simulate:dao`: DAO 공격 재현
- `simulate:dao-fixes`: DAO 수정안 검증
- `simulate:parity1`: Parity #1 재현 및 수정 검증
- `simulate:parity2`: Parity #2 freeze 재현 및 수정 검증
- `simulate:all`: 위 네 개를 순서대로 실행
- `test`: compile 후 simulate:all 실행

로그에 반드시 들어가야 하는 검증 포인트:
- DAO 공격 후 DAO balance = 0 ETH
- DAO 공격 후 attacker contract balance = 11 ETH
- DAO 수정 버전에서 reentrancy drain 실패
- Parity #1에서 Wallet 2, Wallet 3은 공격자가 owner가 된 뒤 drain됨
- Parity #1 fixed wallet은 재초기화와 비-owner execute가 실패함
- Parity #2에서 library code bytes가 selfdestruct 후 0이 됨
- Parity #2에서 wallet ETH는 사라지지 않고 frozen 상태로 남음
- Parity #2 fixed library는 직접 초기화와 selfdestruct 경로가 없음

코드 작성 원칙:
- Solidity와 JavaScript 코드는 초보자가 읽을 수 있게 간결하게 작성한다.
- 위험한 취약 컨트랙트에는 "local teaching only" 성격을 주석으로 명확히 남긴다.
- 실제 네트워크 배포 설정, private key, RPC URL, `.env` 사용은 만들지 않는다.
- 모든 결과는 assertion 또는 명확한 실패/revert 로그로 확인한다.
- 최종 README에는 실행 방법, 파일 구조, 취약점 요약, 수정 원리, 로컬 전용 경고를 포함한다.

먼저 전체 파일 구조와 구현 계획을 짧게 제시한 뒤, 실제 파일별 코드를 작성해라.
한 번에 출력이 너무 길면 `contracts/dao`, `contracts/parity1`, `contracts/parity2`, `scripts`, `README/diagram`처럼 파일 그룹별로 나누어 이어서 작성하라.
마지막에는 내가 어떤 명령을 실행해야 하는지와 성공했을 때 어떤 로그가 보여야 하는지 체크리스트로 정리해라.
```

## 제출 전 자체 점검 프롬프트

학생이 구현을 끝낸 뒤에는 아래 프롬프트를 AI에게 한 번 더 넣어 검토하게 하면 좋습니다.

```text
내가 만든 Week 12 스마트 컨트랙트 보안 실습 프로젝트를 제출 전 검토해줘.

검토 기준:
1. DAO Hack 재진입 공격이 실제로 로컬에서 DAO 잔액을 0 ETH로 만드는가?
2. DAO 수정안 3개, CEI / Reentrancy guard / Pull-over-push가 모두 구현되어 있는가?
3. Parity #1에서 delegatecall을 통한 unprotected initWallet 문제가 정확히 재현되는가?
4. Parity #1 fixed 버전에서 재초기화와 비-owner 실행이 막히는가?
5. Parity #2에서 library selfdestruct 후 wallet funds가 stolen이 아니라 frozen으로 설명되는가?
6. Parity #2 fixed 버전에서 direct library initialization과 selfdestruct 경로가 제거되었는가?
7. 로그 파일이 과제 요구사항을 증명할 만큼 충분한가?
8. README와 diagram이 코드 결과와 모순되지 않는가?
9. 실제 네트워크, RPC URL, private key, wallet 연결이 전혀 없는가?
10. `npm test` 한 번으로 compile과 모든 simulation이 실행되는가?

문제가 있으면 파일명 기준으로 고쳐야 할 부분을 먼저 지적하고, 그 다음 수정 코드를 제안해줘.
```
