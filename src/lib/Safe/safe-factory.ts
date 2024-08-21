import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";
import { Safe } from "./safe";
import { GebSafeProvider } from "./geb-safe-provider";
import { Collateral, FlashSwapStrategy, ILogger } from "./types";
import { ITransactionManager } from "../TransactionQueue/types";

/**
 * Factory class for creating Safe instances.
 */
export class SafeFactory {
  private safeProvider: GebSafeProvider;

  /**
   * Creates an instance of SafeFactory.
   * @param {Geb} geb - The Geb instance to interact with the GEB system.
   * @param {ethers.providers.JsonRpcProvider} provider - The Ethereum provider.
   * @param {TransactionQueue} transactionQueue - The transaction queue for managing transactions.
   * @param {ILogger} logger - The logger for logging information and errors.
   * @param {FlashSwapStrategy} [flashSwapStrategy] - Optional flash swap strategy.
   */
  constructor(
    private geb: Geb,
    private provider: ethers.providers.JsonRpcProvider,
    private transactionManager: ITransactionManager,
    private logger: ILogger,
    private flashSwapStrategy?: FlashSwapStrategy
  ) {
    this.safeProvider = new GebSafeProvider(geb);
  }

  /**
   * Creates a new Safe instance.
   * @param {Collateral} collateral - The collateral associated with the Safe.
   * @param {string} safeAddress - The address of the Safe.
   * @param {string} keeperAddress - The address of the keeper.
   * @returns {Safe} A new Safe instance.
   */
  createSafe(
    collateral: Collateral,
    safeAddress: string,
    keeperAddress: string
  ): Safe {
    return new Safe(
      this.safeProvider,
      this.logger,
      this.transactionManager,
      safeAddress,
      collateral,
      this.flashSwapStrategy
    );
  }
}
