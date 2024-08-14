import { ethers } from "ethers";
import { TokenData } from "@hai-on-op/sdk";

import {
  CollateralParams,
  CollateralData,
  ICollateralFetcher,
  ILogger,
} from "./types";

/**
 * Represents a collateral in the keeper.
 */
export class Collateral {
  private params: CollateralParams | undefined;
  private data: CollateralData | undefined;
  public initialized: boolean = false;

  /**
   * Creates an instance of Collateral.
   * @param tokenData - The token data for this collateral.
   * @param fetcher - The fetcher used to retrieve collateral information.
   * @param log - The logger used for debugging and error reporting.
   */
  constructor(
    public readonly tokenData: TokenData,
    private readonly fetcher: ICollateralFetcher,
    private readonly log: ILogger
  ) {}

  /**
   * Initializes the collateral by fetching its information.
   * @throws Will throw an error if initialization fails.
   */
  public async init(): Promise<void> {
    try {
      this.log.debug("Initializing collateral.");
      await this.updateInfo();
      this.initialized = true;
      this.log.debug("Collateral initialized.");
    } catch (error) {
      this.log.error("Error initializing collateral:", error);
      throw new Error("Failed to initialize collateral");
    }
  }

  /**
   * Updates the collateral information.
   * @throws Will throw an error if the update fails.
   */
  public async updateInfo(): Promise<void> {
    try {
      this.log.debug("Updating collateral.");
      await this.fetchCollateralInfo();
      this.log.debug("Collateral updated.");
    } catch (error) {
      this.log.error("Error updating collateral:", error);
      throw new Error("Failed to update collateral information");
    }
  }

  /**
   * Fetches the latest collateral information.
   * @private
   */
  private async fetchCollateralInfo(): Promise<void> {
    const [params, data] = await Promise.all([
      this.fetcher.fetchParams(this.tokenData.bytes32String),
      this.fetcher.fetchData(this.tokenData.bytes32String),
    ]);
    this.params = params;
    this.data = data;
  }

  /**
   * Gets the normalized collateral information.
   * @returns A record of normalized collateral information.
   * @throws Will throw an error if the collateral is not initialized.
   */
  public getNormalizedInfo(): Record<string, string> {
    if (!this.initialized || !this.params || !this.data) {
      throw new Error("Collateral is not initialized yet.");
    }

    try {
      const normalizedInfo = {
        debtCeiling: ethers.utils.formatUnits(this.params.debtCeiling, 45),
        debtFloor: ethers.utils.formatUnits(this.params.debtFloor, 45),
        debtAmount: ethers.utils.formatUnits(this.data.debtAmount, 18),
        lockedAmount: ethers.utils.formatUnits(this.data.lockedAmount, 18),
        accumulatedRate: ethers.utils.formatUnits(
          this.data.accumulatedRate,
          27
        ),
        safetyPrice: ethers.utils.formatUnits(this.data.safetyPrice, 27),
        liquidationPrice: ethers.utils.formatUnits(
          this.data.liquidationPrice,
          27
        ),
      };

      this.log.debug(
        "Normalized collateral information obtained",
        normalizedInfo
      );
      return normalizedInfo;
    } catch (error) {
      this.log.error("Error getting normalized collateral information", error);
      throw new Error("Failed to get normalized collateral information");
    }
  }

  /**
   * Gets the collateral parameters.
   * @returns The collateral parameters.
   * @throws Will throw an error if the collateral is not initialized.
   */
  public getParams(): CollateralParams {
    if (!this.initialized || !this.params) {
      throw new Error("Collateral is not initialized yet.");
    }
    return this.params;
  }

  /**
   * Gets the collateral data.
   * @returns The collateral data.
   * @throws Will throw an error if the collateral is not initialized.
   */
  public getData(): CollateralData {
    if (!this.initialized || !this.data) {
      throw new Error("Collateral is not initialized yet.");
    }
    return this.data;
  }
}
