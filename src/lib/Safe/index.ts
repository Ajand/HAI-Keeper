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

  async getSafeEngineParams() {}

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

  minBigNumber(a: ethers.BigNumber, b: ethers.BigNumber): ethers.BigNumber {
    return a.lt(b) ? a : b;
  }

  getLimitAdjustedDebt(
    generatedDebt: ethers.BigNumber,
    accumulatedRate: ethers.BigNumber,
    liquidationQuantity: ethers.BigNumber,
    liquidationPenalty: ethers.BigNumber,
    debtFloor: ethers.BigNumber
  ): number {
    //const WAD = ethers.utils.parseUnits("1", 18);

    //console.log(WAD);

    return 5;
    /*let limitAdjustedDebt: ethers.BigNumber = this.minBigNumber(
      generatedDebt,
      liquidationQuantity / liquidationPenalty / accumulatedRate
    );

    // NOTE: If the SAFE is dusty afterwards, we liquidate the whole debt
    limitAdjustedDebt =
      limitAdjustedDebt !== generatedDebt &&
      generatedDebt - limitAdjustedDebt < debtFloor / accumulatedRate
        ? generatedDebt
        : limitAdjustedDebt;

    return limitAdjustedDebt;*/
  }

  canLiquidate() {
    // In the RAI system there was a check for liqudation that was about on auctioned system coin limit
    // In HAI code base that check is removed so it does not make sense to check it in the keeper as well
    // Also we have to add debt limits later to this
    // For now it just check if the safe is critical or not

    //this.getLimitAdjustedDebt(this.generatedDebt, this.collateral.accumulatedRate,);

    return this.isCritical();
  }

  async liquidate() {
    if (!this.canLiquidate) {
      throw new Error("Not liquidatable!");
    }
    //console.log(
    //  "we are ready to liquidate",
    //  this.collateral.tokenData.bytes32String,
    //  this.address
    //);

    const liquidationEngine = this.geb.contracts.liquidationEngine;

    const liquidationEngineParams = await liquidationEngine._params();

    //console.log(
    //  "liquidation engine params: ",
    //  liquidationEngineParams.toString()
    //);
    //
    //console.log(
    //  "current on auction system coins",
    //  (await liquidationEngine.currentOnAuctionSystemCoins()).toString()
    //);

    try {
      const tx = await liquidationEngine.liquidateSAFE(
        this.collateral.tokenData.bytes32String,
        this.address
      );
      const receipt = await tx?.wait();

      return receipt;
    } catch (err) {
      // @ts-ignore
      console.log(err);
      // @ts-ignore
      const revertData = "0x1baf9c1c";
      console.log("revert data is: ", revertData);
      const decodedError = liquidationEngine.interface.parseError(revertData);
      console.log(`Transaction failed: ${decodedError.name}`);
    }
  }
}
