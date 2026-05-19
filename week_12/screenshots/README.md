# Screenshot Evidence

These images are optional visual evidence for the Week 12 local Hardhat run. They are not a replacement for the text logs under `../logs/`, because the logs are easier to diff and verify.

| File | Shows | Primary evidence file |
| --- | --- | --- |
| `01-npm-test-dao-attack.png` | `npm test` start, compile step, and vulnerable DAO reentrancy drain output. | `../logs/dao_attack.log` |
| `02-dao-fixes-cei-guard.png` | CEI and reentrancy-guard variants reverting the reentrant attack path. | `../logs/dao_fixes.log` |
| `03-dao-fixes-pull-payment.png` | Pull-over-push variant avoiding the callback path and preserving safe claim behavior. | `../logs/dao_fixes.log` |
| `04-parity1-unauthorized-initialization.png` | Parity #1 unauthorized initialization replay plus fixed-wallet protection. | `../logs/parity1_attack.log` |

Parity #2 is documented in `../logs/parity2_freeze.log`; it is not fully captured by the screenshots here.
