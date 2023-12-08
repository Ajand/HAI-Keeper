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
}
