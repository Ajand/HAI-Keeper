import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";

import hre from "hardhat";
import { expect } from "chai";

import { mintHai, generateTwentySafe } from "./fixtures";
import { getPastSafeModifications } from "../src/Keeper/EventHandlers";

import { Collateral } from "../src/lib";

describe("Get Past Modifications Logs", () => {
  it("Should find a single log", async () => {
    const { provider, geb } = await loadFixture(mintHai);

    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER);
    const endBlock = (await provider.getBlock("latest")).number;

    const wethCollateral = new Collateral(
      { provider, geb },
      geb.tokenList.WETH
    );

    await wethCollateral.init();

    const logs = await getPastSafeModifications({ geb, provider })(
      startingBlock,
      endBlock,
      wethCollateral,
      1
    );

    expect(logs.length).to.be.equal(1);
  });

  it("Should find a ten logs", async () => {
    const { provider, geb } = await loadFixture(generateTwentySafe);

    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER);
    const endBlock = (await provider.getBlock("latest")).number;

    const wethCollateral = new Collateral(
      { provider, geb },
      geb.tokenList.WETH
    );

    await wethCollateral.init();

    const logs = await getPastSafeModifications({ geb, provider })(
      startingBlock,
      endBlock,
      wethCollateral,
      50
    );

    expect(logs.length).to.be.equal(10);
  });
});
