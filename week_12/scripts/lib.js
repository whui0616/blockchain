import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import hre from "hardhat";
import { ethers } from "ethers";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const rootDir = path.resolve(__dirname, "..");

export function eth(value) {
  return ethers.parseEther(String(value));
}

export function fmt(value) {
  return `${ethers.formatEther(value)} ETH`;
}

export function assertOk(condition, label) {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED] ${label}`);
  }
  console.log(`[assertion ok] ${label}`);
}

export function assertEqual(actual, expected, label, formatter = String) {
  if (actual !== expected) {
    throw new Error(`[ASSERTION FAILED] ${label}: expected ${formatter(expected)}, got ${formatter(actual)}`);
  }
  console.log(`[assertion ok] ${label}: ${formatter(actual)}`);
}

export async function withLog(logFile, fn) {
  const fullPath = path.join(rootDir, logFile);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  const lines = [];
  const original = console.log;
  console.log = (...args) => {
    const line = args
      .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg, null, 2)))
      .join(" ");
    lines.push(line);
    original(...args);
  };
  try {
    await fn();
  } finally {
    console.log = original;
    fs.writeFileSync(fullPath, `${lines.join("\n")}\n`, "utf8");
    original(`\n[log saved] ${fullPath}`);
  }
}

export async function runtime() {
  const { provider: hardhatProvider } = await hre.network.create();
  const accounts = await hardhatProvider.request({ method: "eth_accounts" });
  const provider = new ethers.BrowserProvider(hardhatProvider);
  const signers = [];
  for (const account of accounts.slice(0, 6)) {
    signers.push(await provider.getSigner(account));
  }
  return { provider, hardhatProvider, accounts, signers };
}

export function artifact(contractName) {
  const artifactsRoot = path.join(rootDir, "artifacts", "contracts");
  const matches = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      if (entry.isFile() && entry.name === `${contractName}.json` && !full.endsWith(".dbg.json")) {
        matches.push(full);
      }
    }
  }
  walk(artifactsRoot);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one artifact for ${contractName}, found ${matches.length}: ${matches.join(", ")}`);
  }
  return JSON.parse(fs.readFileSync(matches[0], "utf8"));
}

export async function deploy(contractName, signer, args = [], overrides = {}) {
  const art = artifact(contractName);
  const factory = new ethers.ContractFactory(art.abi, art.bytecode, signer);
  const contract = await factory.deploy(...args, overrides);
  await contract.waitForDeployment();
  return contract;
}

export async function balance(provider, address) {
  return BigInt(await provider.send("eth_getBalance", [address, "latest"]));
}

export async function expectRevert(label, promiseFactory) {
  try {
    const tx = await promiseFactory();
    await tx.wait();
    console.log(`[UNEXPECTED SUCCESS] ${label}`);
    throw new Error(`${label} unexpectedly succeeded`);
  } catch (error) {
    if (error?.message?.includes("unexpectedly succeeded")) {
      throw error;
    }
    const reason = error?.shortMessage || error?.message || String(error);
    console.log(`[expected revert] ${label}: ${reason.split("\n")[0]}`);
    return true;
  }
}
