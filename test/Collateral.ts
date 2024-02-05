import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";
import { filter, take } from "rxjs";

import { expect } from "chai";

import { basicCollateralFixture } from "./fixtures";

import { Collateral } from "../src/lib";

describe("Collateral class", () => {
  it("Should get a single collateral", async () => {
    const { geb, provider } = await loadFixture(basicCollateralFixture);

    const wethCollateral = new Collateral(
      { provider, geb },
      geb.tokenList.WETH
    );

    const collateralParamsObservable = wethCollateral.collateralParams$.pipe(
      filter((collateralParams) => collateralParams !== null),
      take(1) // Take only the first non-null value
    );
    const collateralDataObservable = wethCollateral.collateralData$.pipe(
      filter((collateralData) => collateralData !== null),
      take(1) // Take only the first non-null value
    );

    const initializedObservable = wethCollateral.initialized$.pipe(
      filter((initialized) => initialized !== false),
      take(1) // Take only the first non-null value
    );

    const normalizedDataObservable = wethCollateral.normalizedData$.pipe(
      filter((normalizedData) => normalizedData !== null),
      take(1) // Take only the first non-null value
    );

    await wethCollateral.init();

    const collateralParamsPromise = collateralParamsObservable.toPromise();
    const collateralDataPromise = collateralDataObservable.toPromise();
    const initializedPromise = initializedObservable.toPromise();

    const [collateralParams, collateralData, initialized, normalizedData] =
      await Promise.all([
        collateralParamsPromise,
        collateralDataPromise,
        initializedPromise,
        normalizedDataObservable.toPromise(),
      ]);

    expect(initialized).to.be.true;

    expect(collateralParams).to.be.exist;
    if (collateralParams) {
      expect(collateralParams.debtCeiling).to.be.gt(0);
      expect(collateralParams.debtFloor).to.be.gt(0);
    }
    expect(collateralData).to.be.exist;
    if (collateralData) {
      expect(collateralData.debtAmount).to.be.gt(0);
      expect(collateralData.lockedAmount).to.be.gt(0);
      expect(collateralData.accumulatedRate).to.be.gt(0);
      expect(collateralData.safetyPrice).to.be.gt(0);
      expect(collateralData.liquidationPrice).to.be.gt(0);
    }

    console.log(normalizedData);
  });
});
