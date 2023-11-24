import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@chaos-labs/chainlink-hardhat-plugin";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: "0.8.19",
  networks: {
    hardhat: {
      loggingEnabled: true,
      forking: {
        url: String(process.env.RPC_URI),
        blockNumber: Number(process.env.FORK_BLOCK_NUMBER),
      },
    },
  },
  mocha: {
    timeout: 100000000,
  },
};

export default config;
