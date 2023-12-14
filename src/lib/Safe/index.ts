import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";

import { Collateral } from "../Collateral";

interface SafeInfrustructure {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
}

export class Safe {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;

  initialized: boolean = false;

  collateral: Collateral;
  address: string;

  // safe params
  lockedCollateral: ethers.BigNumber | undefined; // Wad
  generatedDebt: ethers.BigNumber | undefined; // Wad

  constructor(
    { provider, geb }: SafeInfrustructure,
    collateral: Collateral,
    address: string
  ) {
    this.provider = provider;
    this.geb = geb;
    this.collateral = collateral;
    this.address = address;
  }

  async init() {
    try {
      await this.getSafeInfo();
      this.initialized = true;
    } catch (err) {
      console.error(err);
    }
  }

  async updateInfo() {
    try {
      await this.getSafeInfo();
    } catch (err) {
      console.error(err);
    }
  }

  async getSafeInfo() {
    try {
      await this.getSafeParams();
    } catch (err) {
      console.error(err);
    }
  }

  async getSafeParams() {
    const safeParams = await this.geb.contracts.safeEngine.safes(
      this.collateral.tokenData.bytes32String,
      this.address
    );
    this.lockedCollateral = safeParams.lockedCollateral;
    this.generatedDebt = safeParams.generatedDebt;
  }

  getNormalizedInfo() {
    if (this.generatedDebt && this.lockedCollateral) {
      const lockedCollateral = ethers.utils.formatUnits(
        this.lockedCollateral,
        18
      );
      const generatedDebt = ethers.utils.formatUnits(this.generatedDebt, 18);

      return {
        lockedCollateral,
        generatedDebt,
      };
    } else {
      throw new Error("not initialized yet.");
    }
  }

  getCriticalAssesmentParams() {
    const accumulatedRate = this.collateral.accumulatedRate;
    const liquidationPrice = this.collateral.liquidationPrice;

    if (!accumulatedRate || !liquidationPrice) {
      throw new Error("Collateral is not initialized.");
    }

    if (!this.generatedDebt || !this.lockedCollateral) {
      throw new Error("Safe is not initialized!");
    }

    return {
      accumulatedRate,
      liquidationPrice,
      generatedDebt: this.generatedDebt,
      lockedCollateral: this.lockedCollateral,
    };
  }

  getCriticalityRatio() {
    const {
      accumulatedRate,
      liquidationPrice,
      generatedDebt,
      lockedCollateral,
    } = this.getCriticalAssesmentParams();

    const ratio =
      Number(
        ethers.utils.formatUnits(lockedCollateral.mul(liquidationPrice), 45)
      ) /
      Number(ethers.utils.formatUnits(generatedDebt.mul(accumulatedRate), 45));

    // Ratio less than 1 means the safe is critical
    return ratio;
  }

  isCritical() {
    const {
      accumulatedRate,
      liquidationPrice,
      generatedDebt,
      lockedCollateral,
    } = this.getCriticalAssesmentParams();

    const isCrit =
      lockedCollateral.mul(liquidationPrice) <
      generatedDebt.mul(accumulatedRate);

    return isCrit;
  }

  canLiquidate() {
    // In the RAI system there was a check for liqudation that was about on auctioned system coin limit
    // In HAI code base that check is removed so it does not make sense to check it in the keeper as well
    // Also we have to add debt limits later to this
    // For now it just check if the safe is critical or not
    return this.isCritical();
  }
}
