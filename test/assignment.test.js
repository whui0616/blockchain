const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Assignment regression checks", function () {
  it("DAO vulnerable contract is drainable by reentrancy", async function () {
    const [_, victimA, victimB, attackerEOA] = await ethers.getSigners();

    const DAO = await ethers.getContractFactory("SimpleDAOVulnerable");
    const dao = await DAO.deploy();
    await dao.waitForDeployment();

    await (await dao.connect(victimA).donate({ value: ethers.parseEther("6") })).wait();
    await (await dao.connect(victimB).donate({ value: ethers.parseEther("4") })).wait();

    const Attacker = await ethers.getContractFactory("DAOAttacker");
    const attacker = await Attacker.connect(attackerEOA).deploy(await dao.getAddress());
    await attacker.waitForDeployment();
    await (await attacker.connect(attackerEOA).attack({ value: ethers.parseEther("1") })).wait();

    expect(await ethers.provider.getBalance(await dao.getAddress())).to.equal(0n);
  });

  it("DAO fixed contracts block reentrancy", async function () {
    const [_, victim, attackerEOA] = await ethers.getSigners();
    const Attacker = await ethers.getContractFactory("DAOAttacker");

    const CEI = await ethers.getContractFactory("SimpleDAOFixedCEI");
    const cei = await CEI.deploy();
    await cei.waitForDeployment();
    await (await cei.connect(victim).donate({ value: ethers.parseEther("5") })).wait();
    const attackOnCei = await Attacker.connect(attackerEOA).deploy(await cei.getAddress());
    await attackOnCei.waitForDeployment();
    await expect(
      attackOnCei.connect(attackerEOA).attack({ value: ethers.parseEther("1") })
    ).to.be.reverted;

    const Guard = await ethers.getContractFactory("SimpleDAOFixedGuard");
    const guard = await Guard.deploy();
    await guard.waitForDeployment();
    await (await guard.connect(victim).donate({ value: ethers.parseEther("5") })).wait();
    const attackOnGuard = await Attacker.connect(attackerEOA).deploy(await guard.getAddress());
    await attackOnGuard.waitForDeployment();
    await expect(
      attackOnGuard.connect(attackerEOA).attack({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });

  it("Parity #1 takeover works on vulnerable and fails on fixed", async function () {
    const [deployer, legitOwner, attacker] = await ethers.getSigners();

    const LibV = await ethers.getContractFactory("WalletLibraryVulnerable", deployer);
    const libV = await LibV.deploy();
    await libV.waitForDeployment();

    const Proxy = await ethers.getContractFactory("WalletProxy", deployer);
    const w1 = await Proxy.deploy(await libV.getAddress());
    const w2 = await Proxy.deploy(await libV.getAddress());
    await Promise.all([w1.waitForDeployment(), w2.waitForDeployment()]);

    const abiV = LibV.interface.fragments;
    const w1Legit = new ethers.Contract(await w1.getAddress(), abiV, legitOwner);
    const w2Attacker = new ethers.Contract(await w2.getAddress(), abiV, attacker);
    await (await w1Legit.initWallet(await legitOwner.getAddress())).wait();
    await (await w2Attacker.initWallet(await attacker.getAddress())).wait();
    expect(await w2Attacker.owner()).to.equal(await attacker.getAddress());

    const LibF = await ethers.getContractFactory("WalletLibraryFixed", deployer);
    const libF = await LibF.deploy();
    await libF.waitForDeployment();
    const wf = await Proxy.deploy(await libF.getAddress());
    await wf.waitForDeployment();

    const abiF = LibF.interface.fragments;
    const fixedLegit = new ethers.Contract(await wf.getAddress(), abiF, legitOwner);
    const fixedAttacker = new ethers.Contract(await wf.getAddress(), abiF, attacker);
    await (await fixedLegit.initWallet(await legitOwner.getAddress())).wait();
    await expect(
      fixedAttacker.initWallet(await attacker.getAddress())
    ).to.be.revertedWith("already initialized");
  });
});
