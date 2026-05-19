import { assertEqual, balance, deploy, eth, expectRevert, fmt, runtime, withLog } from "./lib.js";

async function runCase(contractName, label, expectedRevert) {
  const { provider, signers } = await runtime();
  const [deployer, victim, attackerEOA] = signers;
  const dao = await deploy(contractName, deployer);
  const attacker = await deploy("DAOAttacker", attackerEOA, [await dao.getAddress()]);
  const daoAddress = await dao.getAddress();
  const attackerAddress = await attacker.getAddress();

  await (await dao.connect(victim).donate(await victim.getAddress(), { value: eth(10) })).wait();
  console.log(`\n## ${label}`);
  console.log(`${contractName}: ${daoAddress}`);
  console.log(`Victim deposits 10 ETH. DAO balance before attack attempt: ${fmt(await balance(provider, daoAddress))}`);

  if (expectedRevert) {
    await expectRevert(`${contractName} blocks reentrant DAOAttacker.attack`, async () =>
      attacker.connect(attackerEOA).attack(10, { value: eth(1) })
    );
  } else {
    await (await attacker.connect(attackerEOA).attack(10, { value: eth(1) })).wait();
    console.log("Attack transaction completed, but no Ether was pushed to the attacker during withdraw().");
  }

  const daoAfterAttack = await balance(provider, daoAddress);
  const attackerAfterAttack = await balance(provider, attackerAddress);
  console.log(`DAO balance after attack attempt: ${fmt(daoAfterAttack)}`);
  console.log(`Attacker contract balance after attack attempt: ${fmt(attackerAfterAttack)}`);
  console.log(`Recursive calls observed by attacker contract: ${await attacker.reentryCount()}`);

  if (contractName === "SimpleDAO_PullPayment") {
    const pendingAttacker = await dao.pendingPayments(attackerAddress);
    console.log(`Pending pull payment for attacker contract after withdraw(): ${fmt(pendingAttacker)}`);
    assertEqual(pendingAttacker, eth(1), "pull-payment records attacker seed as pending instead of pushing Ether", fmt);

    await (await dao.connect(victim).withdraw(eth(2))).wait();
    const pendingVictim = await dao.pendingPayments(await victim.getAddress());
    console.log(`Pending pull payment for legitimate victim after withdraw(2 ETH): ${fmt(pendingVictim)}`);
    assertEqual(pendingVictim, eth(2), "legitimate user can create a pull-payment claim", fmt);

    await (await dao.connect(victim).claimPayment()).wait();
    console.log(`Pending pull payment for legitimate victim after claimPayment(): ${fmt(await dao.pendingPayments(await victim.getAddress()))}`);
    assertEqual(await dao.pendingPayments(await victim.getAddress()), 0n, "legitimate claim clears pending payment", fmt);
  }

  const expectedDaoBalance = contractName === "SimpleDAO_PullPayment" ? eth(9) : eth(10);
  const finalDaoBalance = await balance(provider, daoAddress);
  assertEqual(finalDaoBalance, expectedDaoBalance, `${contractName} final DAO balance matches protected-flow expectation`, fmt);
  assertEqual(attackerAfterAttack, 0n, `${contractName} attacker received no pushed Ether`, fmt);
}

await withLog("logs/dao_fixes.log", async () => {
  console.log("# DAO Reentrancy Fixes - CEI / Guard / Pull-over-push");
  console.log("Network: Hardhat in-memory simulated network only. No live RPC or wallet used.");

  await runCase("SimpleDAO_CEI", "Fix 1: Checks-Effects-Interactions", true);
  await runCase("SimpleDAO_Guard", "Fix 2: Reentrancy guard", true);
  await runCase("SimpleDAO_PullPayment", "Fix 3: Pull-over-push payment queue", false);

  console.log("\nResult: fixed variants prevent the vulnerable drain path. CEI and guard revert the reentrant attempt; pull-over-push avoids the callback entirely.");
});
