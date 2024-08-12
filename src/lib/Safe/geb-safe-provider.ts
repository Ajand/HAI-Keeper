import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";
import { ISafeProvider, SafeInfo } from "./types";

/**
 * Provides functionality to interact with Safes in the GEB system.
 * @implements {ISafeProvider}
 */
export class GebSafeProvider implements ISafeProvider {
  /**
   * Creates an instance of GebSafeProvider.
   * @param {Geb} geb - The Geb instance to interact with the GEB system.
   */
  constructor(private geb: Geb) {}

  /**
   * Retrieves information about a specific Safe.
   * @param {string} safeAddress - The address of the Safe.
   * @param {string} collateralType - The type of collateral for the Safe.
   * @returns {Promise<SafeInfo>} A promise that resolves to the Safe's information.
   */
  async getSafeInfo(
    safeAddress: string,
    collateralType: string
  ): Promise<SafeInfo> {
    const safeParams = await this.geb.contracts.safeEngine.safes(
      collateralType,
      safeAddress
    );

    return {
      lockedCollateral: safeParams.lockedCollateral,
      generatedDebt: safeParams.generatedDebt,
    };
  }

  /**
   * Liquidates a specific Safe.
   * @param {string} safeAddress - The address of the Safe to liquidate.
   * @param {string} collateralType - The type of collateral for the Safe.
   * @returns {Promise<ethers.ContractReceipt>} A promise that resolves to the transaction receipt.
   */
  async liquidateSafe(
    safeAddress: string,
    collateralType: string
  ): Promise<ethers.ContractReceipt> {
    const liquidationEngine = this.geb.contracts.liquidationEngine;
    const tx = await liquidationEngine.liquidateSAFE(
      collateralType,
      safeAddress
    );
    return await tx.wait();
  }
}
