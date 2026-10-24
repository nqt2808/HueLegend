import { defineConfig } from "hardhat/config";

// Doc DEPLOYER_PRIVATE_KEY tu bien moi truong (khong bao gio ghi hard-code)
const pk = process.env.DEPLOYER_PRIVATE_KEY ?? '';

export default defineConfig({
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  paths: { sources: "./contracts", tests: { solidity: "./test" } },
  networks: {
    sepolia: {
      url: process.env.HUELEGEND_RPC_URL ?? 'https://ethereum-sepolia-rpc.publicnode.com',
      accounts: pk ? [pk] : [],
      chainId: 11155111
    }
  }
});
