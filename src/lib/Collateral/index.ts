import { ethers } from "ethers";
import { Geb, TokenData } from "@hai-on-op/sdk";

interface CollateralInfrastructure {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
}

export class Collateral {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;

  initialized: boolean = false;

  // collateral bytes string;
  tokenData: TokenData;

  // collateral params;
  debtCeiling: ethers.BigNumber | undefined; // RAD
  debtFloor: ethers.BigNumber | undefined; // RAD

  // collateral data
  debtAmount: ethers.BigNumber | undefined; // WAD
  lockedAmount: ethers.BigNumber | undefined; // WAD
  accumulatedRate: ethers.BigNumber | undefined; // RAY
  safetyPrice: ethers.BigNumber | undefined; // RAY
  liquidationPrice: ethers.BigNumber | undefined; // RAY

  constructor(
    { provider, geb }: CollateralInfrastructure,
    tokenData: TokenData
  ) {
    this.provider = provider;
    this.geb = geb;
    this.tokenData = tokenData;
  }

  async init() {
    try {
      await this.getCollateralInfo();
      this.initialized = true;
    } catch (err) {
      console.error(err);
    }
  }

  async getCollateralInfo() {
    try {
      await this.getCollateralParams();
      await this.getCollateralData();
    } catch (err) {
      console.error(err);
    }
  }

  async getCollateralParams() {
    const collateralParams = await this.geb.contracts.safeEngine.cParams(
      this.tokenData.bytes32String
    );
    this.debtCeiling = collateralParams.debtCeiling;
    this.debtFloor = collateralParams.debtFloor;

    //console.log(
    //  "Debt Ceiling: ",
    //  ethers.utils.formatUnits(this.debtCeiling, 45)
    //);
    //console.log("Debt Floor", ethers.utils.formatUnits(this.debtFloor, 45));
  }

  async getCollateralData() {
    const collateralData = await this.geb.contracts.safeEngine.cData(
      this.tokenData.bytes32String
    );

    this.debtAmount = collateralData.debtAmount;
    this.lockedAmount = collateralData.lockedAmount;
    this.accumulatedRate = collateralData.accumulatedRate;
    this.safetyPrice = collateralData.safetyPrice;
    this.liquidationPrice = collateralData.liquidationPrice;
  }

  getNormalizedInfo() {
    if (
      this.debtCeiling &&
      this.debtFloor &&
      this.debtAmount &&
      this.lockedAmount &&
      this.accumulatedRate &&
      this.safetyPrice &&
      this.liquidationPrice
    ) {
      return {
        debtCeiling: ethers.utils.formatUnits(this.debtCeiling, 45),
        debtFloor: ethers.utils.formatUnits(this.debtCeiling, 45),
        debtAmount: ethers.utils.formatUnits(this.debtAmount, 18),
        lockedAmount: ethers.utils.formatUnits(this.lockedAmount, 18),
        accumulatedRate: ethers.utils.formatUnits(this.accumulatedRate, 27),
        safetyPrice: ethers.utils.formatUnits(this.safetyPrice, 27),
        liquidationPrice: ethers.utils.formatUnits(this.liquidationPrice, 27),
      };
    } else {
      throw new Error("not initialized yet.");
    }
  }
}
