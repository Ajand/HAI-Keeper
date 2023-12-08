import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";

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

    await wethCollateral.init();

    expect(wethCollateral.debtCeiling).to.be.gt(0);
    expect(wethCollateral.lockedAmount).to.be.gt(0);
    expect(wethCollateral.accumulatedRate).to.be.gt(0);
    expect(wethCollateral.safetyPrice).to.be.gt(0);
    expect(wethCollateral.liquidationPrice).to.be.gt(0);
    expect(wethCollateral.debtCeiling).to.be.gt(0);
    expect(wethCollateral.debtFloor).to.be.gt(0);

    console.log(wethCollateral.getNormalizedInfo());
  });
});
