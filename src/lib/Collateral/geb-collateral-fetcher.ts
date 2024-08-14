import { Geb } from "@hai-on-op/sdk";
import { ICollateralFetcher, CollateralParams, CollateralData } from "./types";

export class GebCollateralFetcher implements ICollateralFetcher {
  /**
   * Creates an instance of GebCollateralFetcher.
   * @param geb - The Geb SDK instance used for fetching data.
   */
  constructor(private geb: Geb) {}

  /**
   * Fetches collateral parameters for a given token.
   * @param tokenBytes32 - The bytes32 representation of the token.
   * @returns A promise that resolves to the collateral parameters.
   */
  async fetchParams(tokenBytes32: string): Promise<CollateralParams> {
    const collateralParams = await this.geb.contracts.safeEngine.cParams(
      tokenBytes32
    );
    return {
      debtCeiling: collateralParams.debtCeiling,
      debtFloor: collateralParams.debtFloor,
    };
  }

  /**
   * Fetches collateral data for a given token.
   * @param tokenBytes32 - The bytes32 representation of the token.
   * @returns A promise that resolves to the collateral data.
   */
  async fetchData(tokenBytes32: string): Promise<CollateralData> {
    const collateralData = await this.geb.contracts.safeEngine.cData(
      tokenBytes32
    );
    return {
      debtAmount: collateralData.debtAmount,
      lockedAmount: collateralData.lockedAmount,
      accumulatedRate: collateralData.accumulatedRate,
      safetyPrice: collateralData.safetyPrice,
      liquidationPrice: collateralData.liquidationPrice,
    };
  }
}
