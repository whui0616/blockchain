const { ethers } = require("hardhat");

async function deployAndFundVulnerable(deployer, victimA, victimB) {
  const DAO = await ethers.getContractFactory("SimpleDAOVulnerable", deployer);
  const dao = await DAO.deploy();
  await dao.waitForDeployment();

  await (await dao.connect(victimA).donate({ value: ethers.parseEther("6") })).wait();
  await (await dao.connect(victimB).donate({ value: ethers.parseEther("4") })).wait();

  return dao;
}

async function main() {
  const [deployer, victimA, victimB, attackerEOA] = await ethers.getSigners();
  const oneEth = ethers.parseEther("1");

  console.log("=== Part 1: DAO Reentrancy ===");
  const vulnerable = await deployAndFundVulnerable(deployer, victimA, victimB);

  const Attacker = await ethers.getContractFactory("DAOAttacker", attackerEOA);
  const attacker = await Attacker.deploy(await vulnerable.getAddress());
  await attacker.waitForDeployment();

  console.log("Vulnerable DAO balance before:", ethers.formatEther(await ethers.provider.getBalance(await vulnerable.getAddress())), "ETH");
  await (await attacker.connect(attackerEOA).attack({ value: oneEth })).wait();
  console.log("Vulnerable DAO balance after :", ethers.formatEther(await ethers.provider.getBalance(await vulnerable.getAddress())), "ETH");
  console.log("Attacker contract balance    :", ethers.formatEther(await ethers.provider.getBalance(await attacker.getAddress())), "ETH");

  console.log("\n=== Fix A: Checks-Effects-Interactions ===");
  const CEI = await ethers.getContractFactory("SimpleDAOFixedCEI", deployer);
  const fixedCEI = await CEI.deploy();
  await fixedCEI.waitForDeployment();
  await (await fixedCEI.connect(victimA).donate({ value: ethers.parseEther("5") })).wait();
  const attackerOnCEI = await Attacker.deploy(await fixedCEI.getAddress());
  await attackerOnCEI.waitForDeployment();
  try {
    await (await attackerOnCEI.connect(attackerEOA).attack({ value: oneEth })).wait();
    console.log("Unexpected: CEI attack succeeded");
  } catch {
    console.log("CEI blocked reentrancy attack as expected");
  }

  console.log("\n=== Fix B: Reentrancy Guard ===");
  const Guard = await ethers.getContractFactory("SimpleDAOFixedGuard", deployer);
  const fixedGuard = await Guard.deploy();
  await fixedGuard.waitForDeployment();
  await (await fixedGuard.connect(victimA).donate({ value: ethers.parseEther("5") })).wait();
  const attackerOnGuard = await Attacker.deploy(await fixedGuard.getAddress());
  await attackerOnGuard.waitForDeployment();
  try {
    await (await attackerOnGuard.connect(attackerEOA).attack({ value: oneEth })).wait();
    console.log("Unexpected: guard attack succeeded");
  } catch {
    console.log("Reentrancy guard blocked attack as expected");
  }

  console.log("\n=== Fix C: Pull over Push ===");
  const Pull = await ethers.getContractFactory("SimpleDAOPullOverPush", deployer);
  const fixedPull = await Pull.deploy();
  await fixedPull.waitForDeployment();
  await (await fixedPull.connect(victimA).donate({ value: ethers.parseEther("3") })).wait();
  await (await fixedPull.connect(victimA).requestWithdraw(ethers.parseEther("1"))).wait();
  await (await fixedPull.connect(victimA).withdrawCredit()).wait();
  console.log("Pull-over-push flow worked; no direct external call inside balance update path.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
