import { ethers } from "hardhat";
import "dotenv/config";

function removeZerosAfterX(hexString: string) {
  // Use a regular expression to match "0" right after "x" and any consecutive zeros
  const modifiedString = hexString.replace(/x0+/g, "x");

  return modifiedString;
}

export const getProvider = () => {
  return new ethers.providers.JsonRpcProvider("http://localhost:8545");
};

export const mineBlocks = async (blocks: number) => {
  const provider = getProvider();
  await provider.send("hardhat_mine", [
    removeZerosAfterX(ethers.utils.hexlify(blocks)),
  ]);
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
