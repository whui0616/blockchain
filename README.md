# Simulating Historic Ethereum Smart Contract Hacks

Local-only Hardhat project for:

- Part 1: DAO reentrancy (2016)
- Part 2: Parity unauthorized initialization (2017)
- Part 3: Parity library self-destruct (2017)

## Safety

- This project is for local simulation and education only.
- Do **not** deploy these vulnerable contracts on public networks.

## Setup

```bash
npm install
```

## Run

```bash
npm run compile
npm run dao:attack
npm run parity:init-hijack
npm run parity:selfdestruct
```

## Deliverables Mapping

- Attack scripts: `scripts/`
- Vulnerable + fixed contracts: `contracts/`
- Transaction logs: console output from each script command

## Git Upload

```bash
git init
git add .
git commit -m "Add local simulations for DAO and Parity wallet hacks"
git branch -M main
git remote add origin <YOUR_REPO_URL>
git push -u origin main
```
