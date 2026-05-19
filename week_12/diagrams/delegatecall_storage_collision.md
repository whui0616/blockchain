# Delegatecall Storage Map — Parity Wallet Lessons

`delegatecall` executes library code **in the caller/proxy storage context**. The library's state variable order must match the proxy's state variable order.

## Shared layout used in the lab

| Slot | Proxy variable | Library code assumes | Why it matters |
|---:|---|---|---|
| 0 | `walletLibrary` | `walletLibrary` | Proxy must know which code address to delegate to. |
| 1 | `owners` dynamic array length | `owners` | `initWallet()` writes owners into the proxy, not into the library, when called through the proxy. |
| 2 | `isOwner` mapping root | `isOwner` | `execute()` checks ownership from proxy storage. |
| 3 | `required` | `required` | Signature threshold / lesson simplification. |
| 4 | `initialized` in Parity #2 shared-wallet model | `initialized` | Used to show how a fixed library can protect its own storage while still initializing proxy storage. |

## Parity #1: unauthorized initialization

1. Proxy wallet is deployed with `walletLibrary`, but owner storage is empty.
2. Attacker calls `initWallet([attacker], 1)` on the proxy.
3. Proxy fallback delegates to the library.
4. Library code writes `owners` and `isOwner` into proxy storage.
5. Attacker calls `execute(attacker, balance)` and drains the proxy.

## Parity #2: library self-destruct

1. Shared wallets depend on one library address.
2. The library contract itself is also uninitialized.
3. Attacker calls `initWallet([attacker], 1)` directly on the library, writing to **library storage**.
4. Attacker calls `killLibrary()` directly on the library.
5. Wallet proxies still hold ETH, but delegatecall target code is gone, so calls fail.
6. Key wording: **funds frozen, not stolen**.

## Safety scope

This diagram is for a local Hardhat simulation only. It must not be used against live contracts or live networks.
