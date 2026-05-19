import { defineConfig } from "hardhat/config";

export default defineConfig({
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      },
      // Parity #2 needs pre-Cancun SELFDESTRUCT semantics for a historical replay.
      evmVersion: "paris"
    }
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
      hardfork: "merge"
    }
  }
});
