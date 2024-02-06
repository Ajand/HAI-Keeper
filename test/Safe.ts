import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";
import { expect } from "chai";
import hre from "hardhat";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { TestScheduler } from "rxjs/testing";
import { filter, take } from "rxjs";

import { mintHai } from "./fixtures";
import { changeCollateralPrice, resetNetwork } from "./utils";

import { Collateral, Safe, TransactionQueue } from "../src/lib";
import { getPastSafeModifications } from "../src/Keeper/EventHandlers";
import { sleep } from "./utils";

describe("Safe class", () => {
  const basicFixture = async () => {
    const fixtureParams = await mintHai();

    const { geb, provider } = fixtureParams;

    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER);
    const endBlock = (await provider.getBlock("latest")).number;

    const transactionQueue = new TransactionQueue(10);

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
      { provider, geb, transactionQueue },
      wethCollateral,
      pastModifications[0].args._safe
    );

    return {
      ...fixtureParams,
      geb,
      provider,
      wethCollateral,
      safe,
    };
  };

  /*it("Should have proper safe data after initialization", async () => {
    const { safe } = await loadFixture(basicFixture);

    safe.lockedCollateral$.subscribe((lockedCollateral) => {
      expect(lockedCollateral).to.be.null;
    });
    safe.generatedDebt$.subscribe((generatedDebt) => {
      expect(generatedDebt).to.be.null;
    });
  });*/

  /*  describe("Is critical", () => {
    let scheduler;

    beforeEach(() => {
      scheduler = new TestScheduler((actual, expected) => {
        // Perform custom assertion or use assertion library like Chai
        expect(actual).to.deep.equal(expected);
      });
    });

    it("A new created safe should not be critical", async () => {
      const { safe } = await loadFixture(basicFixture);

      // Observable to check for non-null values
      const isCriticalObservable = safe.isCritical$.pipe(
        filter((isCritical) => isCritical !== null),
        take(1) // Take only the first non-null value
      );

      // Observable to check for non-null values
      const criticalityRatioObservable = safe.criticalityRatio$.pipe(
        filter((criticalityRatio) => criticalityRatio !== null),
        take(1) // Take only the first non-null value
      );

      const isCriticalPromise = isCriticalObservable.toPromise();
      const criticalityRatioPromise = criticalityRatioObservable.toPromise();

      // Wait for both observables to emit values
      const [isCritical, criticalityRatio] = await Promise.all([
        isCriticalPromise,
        criticalityRatioPromise,
      ]);

      // Assertions
      console.log("isCritical:", isCritical);
      expect(isCritical).to.be.false;

      console.log("criticalityRatio:", criticalityRatio);
      expect(criticalityRatio).to.be.greaterThan(1);
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

      // Observable to check for non-null values
      const isCriticalObservable = safe.isCritical$.pipe(
        filter((isCritical) => isCritical !== null),
        take(1) // Take only the first non-null value
      );

      // Observable to check for non-null values
      const criticalityRatioObservable = safe.criticalityRatio$.pipe(
        filter((criticalityRatio) => criticalityRatio !== null),
        take(1) // Take only the first non-null value
      );

      const isCriticalPromise = isCriticalObservable.toPromise();
      const criticalityRatioPromise = criticalityRatioObservable.toPromise();

      // Wait for both observables to emit values
      const [isCritical, criticalityRatio] = await Promise.all([
        isCriticalPromise,
        criticalityRatioPromise,
      ]);

      // Assertions
      console.log("isCritical:", isCritical);
      expect(isCritical).to.be.true;

      console.log("criticalityRatio:", criticalityRatio);
      expect(criticalityRatio).to.be.lessThanOrEqual(1);
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

      // Observable to check for non-null values
      const isCriticalObservable = safe.isCritical$.pipe(
        filter((isCritical) => isCritical !== null),
        take(1) // Take only the first non-null value
      );

      // Observable to check for non-null values
      const criticalityRatioObservable = safe.criticalityRatio$.pipe(
        filter((criticalityRatio) => criticalityRatio !== null),
        take(1) // Take only the first non-null value
      );

      const isCriticalPromise = isCriticalObservable.toPromise();
      const criticalityRatioPromise = criticalityRatioObservable.toPromise();

      // Wait for both observables to emit values
      const [isCritical, criticalityRatio] = await Promise.all([
        isCriticalPromise,
        criticalityRatioPromise,
      ]);

      // Assertions
      console.log("isCritical:", isCritical);
      expect(isCritical).to.be.false;

      console.log("criticalityRatio:", criticalityRatio);
      expect(criticalityRatio).to.be.greaterThan(1);
    });
  });*/

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

      // wethCollateral.update();

      //const isCriticalObservable = safe.isLiquidated$.pipe(
      //  filter((isCritical) => isCritical !== null),
      //  take(2) // Take only the first non-null value
      //);

      const isLiquidatedObservable = safe.isLiquidated$.pipe(take(2));

      // Wait for both observables to emit values
      const [isLiquidated] = await Promise.all([
        isLiquidatedObservable.toPromise(),
      ]);

      // Assertions
      console.log("isLiquidated:", isLiquidated);
      expect(isLiquidated).to.be.true;

      await sleep(2000);
    });
  });
});
