const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deployer:", await deployer.getAddress());

  const DAOv = await ethers.getContractFactory("SimpleDAOVulnerable");
  const daoV = await DAOv.deploy();
  await daoV.waitForDeployment();

  const Attacker = await ethers.getContractFactory("DAOAttacker");
  const daoAttacker = await Attacker.deploy(await daoV.getAddress());
  await daoAttacker.waitForDeployment();

  const DAOcei = await ethers.getContractFactory("SimpleDAOFixedCEI");
  const daoCei = await DAOcei.deploy();
  await daoCei.waitForDeployment();

  const DAOguard = await ethers.getContractFactory("SimpleDAOFixedGuard");
  const daoGuard = await DAOguard.deploy();
  await daoGuard.waitForDeployment();

  const DAOpull = await ethers.getContractFactory("SimpleDAOPullOverPush");
  const daoPull = await DAOpull.deploy();
  await daoPull.waitForDeployment();

  const LibV = await ethers.getContractFactory("WalletLibraryVulnerable");
  const libV = await LibV.deploy();
  await libV.waitForDeployment();

  const Proxy = await ethers.getContractFactory("WalletProxy");
  const p1 = await Proxy.deploy(await libV.getAddress());
  const p2 = await Proxy.deploy(await libV.getAddress());
  const p3 = await Proxy.deploy(await libV.getAddress());
  await Promise.all([p1.waitForDeployment(), p2.waitForDeployment(), p3.waitForDeployment()]);

  const LibF = await ethers.getContractFactory("WalletLibraryFixed");
  const libF = await LibF.deploy();
  await libF.waitForDeployment();

  console.log("\n=== Deploy Addresses ===");
  console.log("SimpleDAOVulnerable :", await daoV.getAddress());
  console.log("DAOAttacker         :", await daoAttacker.getAddress());
  console.log("SimpleDAOFixedCEI   :", await daoCei.getAddress());
  console.log("SimpleDAOFixedGuard :", await daoGuard.getAddress());
  console.log("SimpleDAOPullOverPush:", await daoPull.getAddress());
  console.log("WalletLibraryVulnerable:", await libV.getAddress());
  console.log("WalletProxy #1      :", await p1.getAddress());
  console.log("WalletProxy #2      :", await p2.getAddress());
  console.log("WalletProxy #3      :", await p3.getAddress());
  console.log("WalletLibraryFixed  :", await libF.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
