import { ethers } from "hardhat";
import "dotenv/config";

export const getProvider = () => {
  return new ethers.providers.JsonRpcProvider("http://localhost:8545");
};

export const resetNetwork = async () => {
  const provider = getProvider();
  await provider.send("hardhat_reset", [
    {
      forking: {
        jsonRpcUrl: process.env.RPC_URI,
        blockNumber: Number(process.env.FORK_BLOCK_NUMBER),
      },
    },
  ]);
};

export const sleep = async (timeout: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), timeout);
  });
};
