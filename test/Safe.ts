import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";

import { expect } from "chai";

import { mintHai } from "./fixtures";

import { Collateral, Safe } from "../src/lib";
import { getPastSafeModifications } from "../src/Keeper/EventHandlers";

describe("Safe class", () => {
  const basicFixture = async () => {
    const { geb, provider } = await mintHai();

    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER);
    const endBlock = (await provider.getBlock("latest")).number;

    const wethCollateral = new Collateral(
      { provider, geb },
      geb.tokenList.WETH
    );

    await wethCollateral.init();

    const pastModifications = await getPastSafeModifications({ geb, provider })(
      startingBlock,
      endBlock,
      "",
      1
    );

    const safe = new Safe(
      { provider, geb },
      wethCollateral,
      pastModifications[0].args._safe
    );

    await safe.init();

    return {
      geb,
      provider,
      wethCollateral,
      safe,
    };
  };

  it("Should have proper safe data after initialization", async () => {
    const { safe } = await loadFixture(basicFixture);
    expect(safe.lockedCollateral).to.not.be.undefined;
    expect(safe.generatedDebt).to.not.be.undefined;
  });

  describe("Is critical", () => {
    it("A new created safe should not be critical", async () => {
      const { safe } = await loadFixture(basicFixture);

      expect(safe.getCriticalityRatio()).to.be.greaterThan(1);
      expect(safe.isCritical()).to.be.false;
    });
  });
});
