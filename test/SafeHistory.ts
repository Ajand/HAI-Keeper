import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";

import { expect } from "chai";

import { generateFiveSafe } from "./fixtures";

import { SafeHistory, Collateral, Safe } from "../src/lib";
import { TransactionQueue } from "../src/lib/TransactionQueue";

describe("Safe History ", () => {
  it("Should create a mapping of Safe instances", async () => {
    const { geb, provider } = await loadFixture(generateFiveSafe);

    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER) + 100;
    const queue = new TransactionQueue(5);

    const wethCollateral = new Collateral(
      { provider, geb },
      geb.tokenList.WETH
    );

    await wethCollateral.init();

    const safeHistory = new SafeHistory(
      { provider, geb, transactionQueue: queue },
      wethCollateral,
      startingBlock
    );

    const safes = await safeHistory.getSafes(50);

    expect([...safes].length).to.be.equal(5);
    expect([...safes][0][1]).to.be.instanceOf(Safe);
  });
});
