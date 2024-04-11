import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";

import { Collateral } from "../Collateral";

import { TransactionQueue } from "../TransactionQueue";

import { Logger } from "pino";
import { getLogger } from "../logger";

interface SafeInfrustructure {
  transactionQueue: TransactionQueue;
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
}

export class Safe {
  transactionQueue: TransactionQueue;
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;

  initialized: boolean = false;

  collateral: Collateral;
  address: string;

  // safe params
  lockedCollateral: ethers.BigNumber | undefined; // Wad
  generatedDebt: ethers.BigNumber | undefined; // Wad

  log: Logger;

  constructor(
    { provider, geb, transactionQueue }: SafeInfrustructure,
    collateral: Collateral,
    address: string,
    keeperAddress: string = ""
  ) {
    this.provider = provider;
    this.geb = geb;
    this.transactionQueue = transactionQueue;
    this.collateral = collateral;
    this.address = address;

    // Create a child logger for Safe class with constructor parameters
    this.log = getLogger(this.address).child({
      module: "Safe",
      collateralSymbol: this.collateral.tokenData.symbol,
      address: this.address,
    });

    // Log debug message for initialization
    this.log.debug("Safe module initialized");
  }

  async init() {
    try {
      this.log.debug("Initializing safe...");
      await this.getSafeInfo();
      this.initialized = true;
      this.log.debug("Safe initialized successfully");
    } catch (error) {
      this.log.error("Error initializing safe", { error });
      throw error;
    }
  }

  async updateInfo() {
    try {
      this.log.debug("Updating safe info...");
      await this.getSafeInfo();
      this.log.debug("Safe info updated");
    } catch (error) {
      this.log.error("Error updating safe info", { error });
      throw error;
    }
  }

  async getSafeInfo() {
    try {
      this.log.debug("Fetching safe params...");
      await this.getSafeParams();
      this.log.debug("Safe params fetched");
    } catch (error) {
      this.log.error("Error fetching safe params", { error });
      throw error;
    }
  }

  async getSafeParams() {
    try {
      this.log.debug("Fetching safe params from Geb contract...");
      const safeParams = await this.geb.contracts.safeEngine.safes(
        this.collateral.tokenData.bytes32String,
        this.address
      );
      this.lockedCollateral = safeParams.lockedCollateral;
      this.generatedDebt = safeParams.generatedDebt;
      this.log.debug("Safe params fetched successfully", {
        lockedCollateral: this.lockedCollateral?.toString(),
        generatedDebt: this.generatedDebt?.toString(),
      });
    } catch (error) {
      this.log.error("Error fetching safe params", { error });
      throw error;
    }
  }

  async getSafeEngineParams() {}

  getNormalizedInfo() {
    try {
      if (this.generatedDebt && this.lockedCollateral) {
        const lockedCollateral = ethers.utils.formatUnits(
          this.lockedCollateral,
          18
        );
        const generatedDebt = ethers.utils.formatUnits(this.generatedDebt, 18);

        this.log.debug("Normalized info fetched successfully", {
          lockedCollateral,
          generatedDebt,
        });

        return {
          lockedCollateral,
          generatedDebt,
        };
      } else {
        this.log.error("Safe not initialized yet.");
        throw new Error("Safe not initialized yet.");
      }
    } catch (error) {
      this.log.error("Error fetching normalized info", { error });
      throw error;
    }
  }

  getCriticalAssesmentParams() {
    try {
      const accumulatedRate = this.collateral.accumulatedRate;
      const liquidationPrice = this.collateral.liquidationPrice;

      if (!accumulatedRate || !liquidationPrice) {
        this.log.error("Collateral is not initialized.");
        throw new Error("Collateral is not initialized.");
      }

      if (!this.generatedDebt || !this.lockedCollateral) {
        this.log.error("Safe is not initialized!");
        throw new Error("Safe is not initialized!");
      }

      return {
        accumulatedRate,
        liquidationPrice,
        generatedDebt: this.generatedDebt,
        lockedCollateral: this.lockedCollateral,
      };
    } catch (error) {
      this.log.error("Error fetching critical assessment parameters", {
        error,
      });
      throw error;
    }
  }

  getCriticalityRatio() {
    try {
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
        Number(
          ethers.utils.formatUnits(generatedDebt.mul(accumulatedRate), 45)
        );

      // Log the criticality ratio
      this.log.debug("Criticality ratio calculated:", ratio);

      // Ratio less than 1 means the safe is critical
      return ratio;
    } catch (error) {
      this.log.error("Error calculating criticality ratio", { error });
      throw error;
    }
  }

  isCritical() {
    try {
      const {
        accumulatedRate,
        liquidationPrice,
        generatedDebt,
        lockedCollateral,
      } = this.getCriticalAssesmentParams();

      const isCrit = lockedCollateral
        .mul(liquidationPrice)
        .lt(generatedDebt.mul(accumulatedRate));

      // Log whether the safe is critical
      this.log.debug("Critical assessment:", { isCritical: isCrit });

      return isCrit;
    } catch (error) {
      this.log.error("Error checking if safe is critical", { error });
      throw error;
    }
  }

  minBigNumber(a: ethers.BigNumber, b: ethers.BigNumber): ethers.BigNumber {
    try {
      // Determine the smaller of the two provided numbers
      const min = a.lt(b) ? a : b;

      // Log the result of the comparison
      this.log.debug("Minimum BigNumber:", { result: min.toString() });

      return min;
    } catch (error) {
      // Log any errors that occur
      this.log.error("Error determining minimum BigNumber", { error });
      throw error;
    }
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
    if (!this.canLiquidate()) {
      this.log.error("Not liquidatable!");
      throw new Error("Not liquidatable!");
    }

    // Log that liquidation is about to start
    this.log.debug("Liquidating safe", {
      collateralSymbol: this.collateral.tokenData.symbol,
      address: this.address,
    });

    const {
      accumulatedRate,
      liquidationPrice,
      generatedDebt,
      lockedCollateral,
    } = this.getCriticalAssesmentParams();

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
      /*console.log(
        `Liquidating safe: ${this.address} - ${this.collateral.tokenData.bytes32String}`,
        this.getCriticalityRatio(),
        this.isCritical(),
        accumulatedRate.toString(),
        liquidationPrice.toString(),
        generatedDebt.toString(),
        lockedCollateral.toString(),
        lockedCollateral.mul(liquidationPrice).toString(),
        generatedDebt.mul(accumulatedRate).toString(),
        lockedCollateral
          .mul(liquidationPrice)
          .lt(generatedDebt.mul(accumulatedRate)),
        lockedCollateral.mul(liquidationPrice) <
          generatedDebt.mul(accumulatedRate)
      );*/

      const tx = await liquidationEngine.liquidateSAFE(
        this.collateral.tokenData.bytes32String,
        this.address
      );
      const receipt = await tx?.wait();

      this.log.info("Safe liquidated successfully", {
        collateralSymbol: this.collateral.tokenData.symbol,
        address: this.address,
        transactionHash: receipt.transactionHash,
      });

      return receipt;
    } catch (error) {
      // @ts-ignore
      this.log.error("Error during liquidation", { error });
      throw error;
      // @ts-ignore
      //const revertData = "0x1baf9c1c";
      //console.log("revert data is: ", revertData);
      //const decodedError = liquidationEngine.interface.parseError(revertData);
      //console.log(`Transaction failed: ${decodedError.name}`);
    }
  }
}
