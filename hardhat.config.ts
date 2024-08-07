import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
      },
      {
        version: "0.8.20",
        settings: {},
      },
    ],
  },
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
