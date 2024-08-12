import {
  ILogger,
  Collateral,
  SafeInfo,
  ISafeProvider,
  FlashSwapStrategy,
} from "./types";

/**
 * Represents a Safe in the system.
 * A Safe is a collateralized debt position that can be managed and potentially liquidated.
 */
export class Safe {
  private safeInfo: SafeInfo | null = null;
  private initialized: boolean = false;

  /**
   * Creates an instance of Safe.
   * @param safeProvider - The provider used to interact with the Safe.
   * @param logger - The logger used for debugging and error reporting.
   * @param address - The address of the Safe.
   * @param collateral - The collateral associated with the Safe.
   * @param flashSwapStrategy - Optional strategy for flash swap liquidations.
   */
  constructor(
    private safeProvider: ISafeProvider,
    private logger: ILogger,
    public readonly address: string,
    public readonly collateral: Collateral,
    public readonly flashSwapStrategy?: FlashSwapStrategy
  ) {}

  /**
   * Initializes the Safe by updating its information.
   * @throws Will throw an error if initialization fails.
   */
  async init(): Promise<void> {
    try {
      this.logger.debug("Initializing safe...");
      await this.updateInfo();
      this.initialized = true;
      this.logger.debug("Safe initialized successfully");
    } catch (error) {
      this.logger.error("Error initializing safe", { error });
      throw new Error("Failed to initialize safe");
    }
  }

  /**
   * Updates the Safe's information.
   * @throws Will throw an error if the update fails.
   */
  async updateInfo(): Promise<void> {
    try {
      this.logger.debug("Updating safe info...");
      this.safeInfo = await this.safeProvider.getSafeInfo(
        this.address,
        this.collateral.tokenData.bytes32String
      );
      this.logger.debug("Safe info updated", { safeInfo: this.safeInfo });
    } catch (error) {
      this.logger.error("Error updating safe info", { error });
      throw new Error("Failed to update safe info");
    }
  }

  /**
   * Checks if the Safe is in a critical state (i.e., can be liquidated).
   * @returns True if the Safe is critical, false otherwise.
   * @throws Will throw an error if the Safe is not initialized.
   */
  isCritical(): boolean {
    if (!this.initialized || !this.safeInfo) {
      throw new Error("Safe not initialized");
    }

    const { lockedCollateral, generatedDebt } = this.safeInfo;
    const { liquidationPrice, accumulatedRate } = this.collateral.getData();

    return lockedCollateral
      .mul(liquidationPrice)
      .lte(generatedDebt.mul(accumulatedRate));
  }

  /**
   * Checks if the Safe can be liquidated.
   * @returns True if the Safe can be liquidated, false otherwise.
   */
  canLiquidate(): boolean {
    return this.isCritical();
  }

  /**
   * Attempts to liquidate the Safe.
   * @throws Will throw an error if the Safe cannot be liquidated or if the liquidation fails.
   */
  async liquidate(): Promise<void> {
    if (!this.canLiquidate()) {
      throw new Error("Safe is not liquidatable");
    }

    try {
      this.logger.debug("Liquidating safe", {
        address: this.address,
        collateralSymbol: this.collateral.tokenData.symbol,
      });

      if (this.flashSwapStrategy) {
        await this.flashSwapStrategy.liquidateAndSettleSafe(this.address);
      } else {
        const receipt = await this.safeProvider.liquidateSafe(
          this.address,
          this.collateral.tokenData.bytes32String
        );
        this.logger.info("Safe liquidated successfully", {
          address: this.address,
          transactionHash: receipt.transactionHash,
        });
      }
    } catch (error) {
      this.logger.error("Error during liquidation", { error });
      throw new Error("Liquidation failed");
    }
  }
}
