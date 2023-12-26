import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";
import hre, { ethers } from "hardhat";
import { expect } from "chai";

import { mineBlocks, sleep, changeCollateralPrice } from "./utils";
import { mintHai } from "./fixtures";

import { REQUIRED_ARGS_KEY_VALUE } from "../tests/contexts/args";
import { keyValueArgsToList } from "../tests/helpers";

import Keeper from "../src/Keeper";

const ALL_ARGS_KEY_VALUE = {
  ...REQUIRED_ARGS_KEY_VALUE,
};

describe("Auction House Tests", () => {
  it("Should liquidate liquidatable safes", async () => {
    const { provider, openSafeAndGenerateDebt, geb, fixtureWallet } =
      await loadFixture(mintHai);

    await mineBlocks(100);
    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER) + 100;

    const keeper = new Keeper(
      keyValueArgsToList({
        ...ALL_ARGS_KEY_VALUE,
        "--from-block": startingBlock.toString(),
      }),
      {
        provider: provider,
      }
    );

    await provider.send("hardhat_setBalance", [
      keeper.signer.address,
      ethers.utils.parseEther("1000000").toHexString(),
    ]);

    const collateralAmount = ethers.utils.parseEther("5").toHexString();
    const haiAmount = ethers.utils.parseEther("7500").toHexString();
    const safeHaiAmount = ethers.utils.parseEther("1000").toHexString();

    await sleep(2000);

    const safe1 = await openSafeAndGenerateDebt(collateralAmount, haiAmount);
    await sleep(2000);

    // After reducing the collateral price, the almost critical safes should be liquidated
    await changeCollateralPrice(150000000000, 105000000000, keeper.collateral)(
      hre,
      provider,
      fixtureWallet,
      geb
    );

    const auctionHouse = keeper.collateralAuctionHouse;

    await auctionHouse.reloadState();

    await sleep(5000);

    await auctionHouse.reloadState();
  });
});
