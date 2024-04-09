import { ethers } from "ethers";
import { Geb, TokenData } from "@hai-on-op/sdk";

import { Logger } from "pino";
import logger from "../logger";

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

  log: Logger;

  constructor(
    { provider, geb }: CollateralInfrastructure,
    tokenData: TokenData
  ) {
    this.provider = provider;
    this.geb = geb;
    this.tokenData = tokenData;

    // Create a child logger for this module
    this.log = logger.child({
      module: "Collateral",
      collateral: this.tokenData.symbol,
      tokenData,
    });
  }

  async init() {
    try {
      this.log.debug("Initializing collateral.");
      await this.getCollateralInfo();
      this.initialized = true;
      this.log.debug("Collateral initialized.");
    } catch (error) {
      this.log.error("Error initializing collateral:", error);
      throw error;
    }
  }

  async updateInfo() {
    try {
      this.log.debug("Updating collateral.");
      await this.getCollateralInfo();
      this.log.debug("Collateral updated.");
    } catch (error) {
      this.log.error("Error updating collateral:", error);
      throw error;
    }
  }

  async getCollateralInfo() {
    try {
      this.log.debug("Fetching collateral info.");
      await this.getCollateralParams();
      await this.getCollateralData();
      this.log.debug("Collateral info fetched.");
    } catch (error) {
      this.log.error("Error fetching collateral info:", error);
      throw error;
    }
  }

  async getCollateralParams() {
    try {
      this.log.debug("Fetching collateral parameters.");
      const collateralParams = await this.geb.contracts.safeEngine.cParams(
        this.tokenData.bytes32String
      );
      this.debtCeiling = collateralParams.debtCeiling;
      this.debtFloor = collateralParams.debtFloor;
      this.log.debug("Collateral parameters fetched:", collateralParams);
    } catch (error) {
      this.log.error("Error fetching collateral parameters:", error);
      throw error;
    }
  }

  async getCollateralData() {
    try {
      this.log.debug("Fetching collateral data.");
      const collateralData = await this.geb.contracts.safeEngine.cData(
        this.tokenData.bytes32String
      );

      this.debtAmount = collateralData.debtAmount;
      this.lockedAmount = collateralData.lockedAmount;
      this.accumulatedRate = collateralData.accumulatedRate;
      this.safetyPrice = collateralData.safetyPrice;
      this.liquidationPrice = collateralData.liquidationPrice;
      this.log.debug("Collateral data fetched:", collateralData);
    } catch (error) {
      this.log.error("Error fetching collateral data:", error);
      throw error;
    }
  }

  getNormalizedInfo() {
    try {
      if (
        this.debtCeiling &&
        this.debtFloor &&
        this.debtAmount &&
        this.lockedAmount &&
        this.accumulatedRate &&
        this.safetyPrice &&
        this.liquidationPrice
      ) {
        const normalizedInfo = {
          debtCeiling: ethers.utils.formatUnits(this.debtCeiling, 45),
          debtFloor: ethers.utils.formatUnits(this.debtFloor, 45),
          debtAmount: ethers.utils.formatUnits(this.debtAmount, 18),
          lockedAmount: ethers.utils.formatUnits(this.lockedAmount, 18),
          accumulatedRate: ethers.utils.formatUnits(this.accumulatedRate, 27),
          safetyPrice: ethers.utils.formatUnits(this.safetyPrice, 27),
          liquidationPrice: ethers.utils.formatUnits(this.liquidationPrice, 27),
        };

        logger.debug({
          message: "Normalized collateral information obtained",
          normalizedInfo,
        });

        return normalizedInfo;
      } else {
        throw new Error("Collateral is not initialized yet.");
      }
    } catch (error) {
      logger.error({
        message: "Error getting normalized collateral information",
        error: error,
      });
      throw error;
    }
  }
}
