// collateral-factory.ts
import { Geb, TokenData } from "@hai-on-op/sdk";
import { Collateral } from "./collateral";
import { GebCollateralFetcher } from "./geb-collateral-fetcher";
import { ICollateralFetcher, ILogger } from "./types";

/**
 * Abstract factory interface for creating collateral fetchers.
 */
export interface CollateralFetcherFactory {
  /**
   * Creates a collateral fetcher.
   * @returns An instance of ICollateralFetcher.
   */
  createFetcher(): ICollateralFetcher;
}

/**
 * Concrete factory for creating GebCollateralFetcher instances.
 */
export class GebCollateralFetcherFactory implements CollateralFetcherFactory {
  /**
   * Creates an instance of GebCollateralFetcherFactory.
   * @param geb - The Geb SDK instance to be used by the fetcher.
   */
  constructor(private geb: Geb) {}

  /**
   * Creates a GebCollateralFetcher instance.
   * @returns An instance of GebCollateralFetcher.
   */
  createFetcher(): ICollateralFetcher {
    return new GebCollateralFetcher(this.geb);
  }
}

/**
 * Factory for creating Collateral instances.
 */
export class CollateralFactory {
  /**
   * Creates an instance of CollateralFactory.
   * @param fetcherFactory - The factory used to create collateral fetchers.
   * @param logger - The logger used by created Collateral instances.
   */
  constructor(
    private fetcherFactory: CollateralFetcherFactory,
    private logger: ILogger
  ) {}

  /**
   * Creates a Collateral instance.
   * @param tokenData - The token data for the collateral.
   * @returns A new Collateral instance.
   */
  createCollateral(tokenData: TokenData): Collateral {
    const fetcher = this.fetcherFactory.createFetcher();
    return new Collateral(tokenData, fetcher, this.logger);
  }
}

/**
 * Enum for different types of collateral fetchers.
 */
export enum CollateralFetcherType {
  GEB = "GEB",
  // Add more types here in the future
}

/**
 * Factory method for creating the appropriate CollateralFetcherFactory.
 * @param type - The type of collateral fetcher to create.
 * @param geb - The Geb SDK instance to be used by the fetcher.
 * @returns An instance of CollateralFetcherFactory.
 * @throws Will throw an error if an unsupported type is provided.
 */
export function createCollateralFetcherFactory(
  type: CollateralFetcherType,
  geb: Geb
): CollateralFetcherFactory {
  switch (type) {
    case CollateralFetcherType.GEB:
      return new GebCollateralFetcherFactory(geb);
    // Add more cases here for future fetcher types
    default:
      throw new Error(`Unsupported collateral fetcher type: ${type}`);
  }
}
