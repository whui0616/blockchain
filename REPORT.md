# Simulating Historic Ethereum Smart Contract Hacks - Report

## 1) Source Code

- DAO vulnerable contract: `contracts/DAOScenario.sol` -> `SimpleDAOVulnerable`
- DAO attacker contract: `contracts/DAOScenario.sol` -> `DAOAttacker`
- DAO fixed contracts 3ea:
  - `SimpleDAOFixedCEI`
  - `SimpleDAOFixedGuard`
  - `SimpleDAOPullOverPush`
- Parity #1 vulnerable contract: `contracts/ParityScenario.sol` -> `WalletLibraryVulnerable` + `WalletProxy`
- Parity #1 attack script: `scripts/parity-init-hijack.js`
- Parity #1 fixed contract: `contracts/ParityScenario.sol` -> `WalletLibraryFixed`
- Parity #2 vulnerable contract: `contracts/ParityScenario.sol` -> `WalletLibraryVulnerable` (`kill()` abuse)
- Parity #2 attack script: `scripts/parity-selfdestruct.js`
- Parity #2 fixed contract: `contracts/ParityScenario.sol` -> `WalletLibraryFixed` (access control + no selfdestruct)

## 2) Execution Scripts

- Deploy script: `scripts/deploy.js`
- Attack scripts:
  - `scripts/dao-attack.js`
  - `scripts/parity-init-hijack.js`
  - `scripts/parity-selfdestruct.js`
- Test script: `test/assignment.test.js`

Commands:

```bash
npm run compile
npm run deploy
npm run dao:attack
npm run parity:init-hijack
npm run parity:selfdestruct
npm test
```

## 3) Transaction Logs (Summary)

### Part 1: DAO Reentrancy

- Attack before balance: `10.0 ETH`
- Attack after balance: `0.0 ETH`
- Attacker contract balance after attack: `11.0 ETH`
- Fixed contract checks:
  - CEI: attack reverted (blocked)
  - Reentrancy guard: attack reverted (blocked)
  - Pull-over-push: withdraw flow works without reentrancy path

### Part 2: Parity Hack #1 (Unauthorized Initialization)

- Owner change status:
  - vulnerable wallet2, wallet3 owner changed to attacker via `initWallet()`
- Balance change:
  - wallet2 delta: `-3.0 ETH`
  - wallet3 delta: `-2.0 ETH`
- Function call result:
  - `initWallet()` on vulnerable wallets: success (unauthorized takeover possible)
  - `execute()` by attacker: success
  - `initWallet()` re-run on fixed wallet: reverted with `already initialized`

### Part 3: Parity Hack #2 (Library Self-Destruct)

- Before attack:
  - 3 proxy wallets funded and share one library
- After `kill()` on shared library:
  - library bytecode length: `2` (destroyed on Berlin hardfork simulation)
- Function call result:
  - proxy `execute()` no longer transfers value
- Balance change during failed withdrawal attempt:
  - recipient delta: `0.0 ETH`
  - wallet delta: `0.0 ETH`
- Interpretation:
  - funds are frozen (not stolen) because wallets lose executable logic path

## 4) Detailed Analysis

### 4-1. DAO Hack (Reentrancy)

#### Hacking principle

External call is executed before state update in `withdraw()`.  
Attacker fallback re-enters `withdraw()` repeatedly while old balance is still recorded.

#### Why vulnerability exists

- Interaction before effects (wrong order)
- No reentrancy guard
- Direct push-payment logic in vulnerable flow

#### Attack process

1. Victims deposit ETH to vulnerable DAO.
2. Attacker deposits small seed ETH.
3. Attacker calls `withdraw()`.
4. Fallback function recursively calls `withdraw()` before balance is reduced.
5. DAO balance drains.

#### Execution result

- DAO balance: `10 -> 0 ETH`
- Attacker contract: `+11 ETH` total held

#### Fix method

- CEI ordering (`SimpleDAOFixedCEI`)
- `nonReentrant` lock (`SimpleDAOFixedGuard`)
- Pull-over-push credits (`SimpleDAOPullOverPush`)

#### Post-fix verification

- CEI attack reverted
- Guard attack reverted
- Pull-over-push path has no recursive drain point

### 4-2. Parity Hack #1 (Unauthorized Initialization)

#### Hacking principle

Proxy delegates calls to library.  
If `initWallet()` has no initialization guard, attacker can call it through proxy and overwrite owner.

#### Why vulnerability exists

- Missing one-time initialization check
- Privileged state (`owner`) mutable by public init path

#### Attack process

1. Deploy one vulnerable library and multiple proxies.
2. Legit owner initializes one wallet.
3. Attacker initializes unprotected wallets.
4. Attacker becomes owner and calls `execute()` to drain ETH.

#### Execution result

- owner changed to attacker on targeted wallets
- wallet balances decreased by executed transfer amounts

#### Fix method

- Add `initialized` gate (`require(!initialized)`)
- Keep strict owner checks on transfer execution

#### Post-fix verification

- second `initWallet()` call reverts with `already initialized`

### 4-3. Parity Hack #2 (Library Self-Destruct)

#### Hacking principle

All proxies depend on a shared library via delegatecall.  
If library has public `kill()`, attacker can destroy it and make every proxy unusable.

#### Why vulnerability exists

- No access control on destructive function
- Shared single-point-of-failure library design

#### Attack process

1. Deploy shared vulnerable library and three proxies.
2. Initialize and fund each proxy.
3. Attacker calls library `kill()`.
4. Proxies still exist, but delegatecall target logic is gone.
5. Wallet functions cannot move funds anymore.

#### Execution result

- transfer attempts do not move ETH
- balances unchanged in withdrawal attempt
- funds become frozen

#### Fix method

- Remove public selfdestruct path
- Add strict access control for admin functions

#### Post-fix verification

- fixed library has no public `kill()`
- privileged flows require valid owner context

## 5) Conclusion

This assignment reproduces historical vulnerability patterns in a local Hardhat environment only.  
All fixes were validated by attack scripts and test cases to confirm exploit paths are blocked.
