import { Safe } from "../Safe";
import { Logger } from "pino";
import { Collateral } from "../Collateral";
import {
  SafeInfrastructure,
  ISafeHistoryConfig,
  ISafeProvider,
  ISafeHistoryDependencies,
} from "./interfaces";
import { getLogger } from "../logger";
import { getPastSafeModifications } from "../../Keeper/EventHandlers";

import { SafeProvider } from "./safe-provider";

export class SafeHistory {
  private readonly infrastructure: SafeInfrastructure;
  private readonly collateral: Collateral;
  private readonly config: ISafeHistoryConfig;
  private readonly safeProvider: ISafeProvider;
  private readonly log: Logger;

  private safes: Map<string, Safe> = new Map();
  private cacheBlock: number;

  constructor({
    infrastructure,
    collateral,
    config,
  }: ISafeHistoryDependencies) {
    this.infrastructure = infrastructure;
    this.collateral = collateral;
    this.config = config;
    this.cacheBlock = config.initialCacheBlock;
    this.safeProvider = new SafeProvider(infrastructure, collateral);

    this.log = getLogger(String(infrastructure.keeperAddress)).child({
      module: "SafeHistory",
      collateralSymbol: this.collateral.tokenData.symbol,
      cacheLookback: this.config.cacheLookback,
      cacheBlock: this.cacheBlock,
    });

    this.log.debug("Safe history instance created.");
  }

  async getSafes(chunkSize: number): Promise<Map<string, Safe>> {
    try {
      const safeAddresses = new Set<string>();
      const fromBlock = Math.max(
        0,
        this.cacheBlock - this.config.cacheLookback
      );
      const toBlock = await this.infrastructure.provider.getBlockNumber();

      this.log.debug(
        `Fetching safe modifications from block ${fromBlock} to ${toBlock}`
      );

      const mods = await this.fetchSafeModifications(
        fromBlock,
        toBlock,
        chunkSize
      );

      this.log.debug(`Found ${mods.length} safe modifications`);

      for (const mod of mods) {
        const safeAddress = mod.args._safe;
        safeAddresses.add(safeAddress);

        if (!this.safes.has(safeAddress)) {
          await this.initializeSafe(safeAddress);
        } else {
          await this.updateSafe(safeAddress);
        }
      }

      this.cacheBlock = toBlock;
      return this.safes;
    } catch (error) {
      this.log.error("Error fetching safes", { error });
      throw error;
    }
  }

  private async fetchSafeModifications(
    fromBlock: number,
    toBlock: number,
    chunkSize: number
  ) {
    return getPastSafeModifications({
      geb: this.infrastructure.geb,
      provider: this.infrastructure.provider,
    })(fromBlock, toBlock, this.collateral, chunkSize);
  }

  private async initializeSafe(safeAddress: string) {
    this.log.debug(`Initializing new safe at address ${safeAddress}`, {
      safeAddress,
    });
    try {
      const safe = await this.safeProvider.getSafe(safeAddress);
      this.safes.set(safeAddress, safe);
      this.log.debug(`Safe initialized at address ${safeAddress}`, {
        safeAddress,
      });
    } catch (err) {
      this.log.error(`Error initializing safe at address ${safeAddress}`, {
        safeAddress,
        error: err,
      });
    }
  }

  private async updateSafe(safeAddress: string) {
    const safe = this.safes.get(safeAddress);
    await safe?.updateInfo();
  }
}
