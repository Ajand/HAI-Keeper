import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";
import { expect } from "chai";
import hre from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";

import { mintHai } from "./fixtures";
import { changeCollateralPrice, resetNetwork } from "./utils";

import { Collateral, Safe } from "../src/lib";
import { getPastSafeModifications } from "../src/Keeper/EventHandlers";

describe("Safe class", () => {
  const basicFixture = async () => {
    const fixtureParams = await mintHai();

    const { geb, provider } = fixtureParams;

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
      wethCollateral,
      50
    );

    const safe = new Safe(
      { provider, geb },
      wethCollateral,
      pastModifications[0].args._safe
    );

    await safe.init();

    return {
      ...fixtureParams,
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

    it("Created safe should be critical after decreasing the price of collateral", async () => {
      const { safe, provider, wethCollateral, geb, fixtureWallet } =
        await basicFixture();

      await changeCollateralPrice(150000000000, 105000000000, wethCollateral)(
        hre,
        provider,
        fixtureWallet,
        geb
      );

      expect(safe.getCriticalityRatio()).to.be.lessThanOrEqual(1);
      expect(safe.isCritical()).to.be.true;
    });

    it("Created safe should not be critical after increasing the price of collateral", async () => {
      const { safe, provider, wethCollateral, geb, fixtureWallet } =
        await basicFixture();

      await changeCollateralPrice(250000000000, 255000000000, wethCollateral)(
        hre,
        provider,
        fixtureWallet,
        geb
      );

      expect(safe.getCriticalityRatio()).to.be.greaterThan(1);
      expect(safe.isCritical()).to.be.false;
    });
  });

  describe("Liquidate safe", () => {
    it("Created safe should be critical after decreasing the price of collateral", async () => {
      const { safe, provider, wethCollateral, geb, fixtureWallet } =
        await basicFixture();

      await changeCollateralPrice(150000000000, 105000000000, wethCollateral)(
        hre,
        provider,
        fixtureWallet,
        geb
      );

      expect(safe.isCritical()).to.be.true;

      const receipt = await safe.liquidate();

      const liquidateEvent = receipt?.events?.find(
        (ev) => ev.event === "Liquidate"
      );

      expect(liquidateEvent).to.not.be.undefined;
      expect(liquidateEvent?.args?._safe).to.be.equal(safe.address);
    });
  });
});
