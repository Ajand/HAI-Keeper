import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";

import { Safe } from "../Safe";
import { Collateral } from "../Collateral";
import { TransactionQueue } from "../TransactionQueue";
import { getPastSafeModifications } from "../../Keeper/EventHandlers";

import { Logger } from "pino";
import logger from "../logger";

interface SafeInfrustructure {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
  transactionQueue: TransactionQueue;
  keeperAddress?: string;
}

export class SafeHistory {
  transactionQueue: TransactionQueue;
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
  collateral: Collateral;
  keeperAddress: string;

  cacheLookback = 12; // for handling block reorgs
  cacheBlock: number;

  safes: Map<string, Safe> = new Map();

  log: Logger;

  constructor(
    { provider, geb, transactionQueue, keeperAddress = "" }: SafeInfrustructure,
    collateral: Collateral,
    from: number
  ) {
    this.transactionQueue = transactionQueue;
    this.provider = provider;
    this.geb = geb;
    this.collateral = collateral;
    this.cacheBlock = from;
    this.keeperAddress = keeperAddress;

    // Create a child logger for SafeHistory class with constructor parameters
    this.log = logger.child({
      module: "SafeHistory",
      collateralSymbol: this.collateral.tokenData.symbol,
      cacheLookback: this.cacheLookback,
      cacheBlock: this.cacheBlock,
    });

    // Log debug message for initialization
    this.log.debug("Safe history instance created.");
  }

  async getSafes(chunkSize: number) {
    try {
      const safeAddresses = new Set();
      let mods = [];

      const fromBlock = Math.max(0, this.cacheBlock - this.cacheLookback);
      const toBlock = await this.provider.getBlockNumber();

      this.log.debug(
        `Fetching safe modifications from block ${fromBlock} to ${toBlock}`
      );

      mods = await getPastSafeModifications({
        geb: this.geb,
        provider: this.provider,
      })(fromBlock, toBlock, this.collateral, chunkSize);

      this.log.debug(`Found ${mods.length} safe modifications`);

      for (const mod of mods) {
        const safeAddress = mod.args._safe;

        safeAddresses.add(safeAddress);

        if (this.safes.has(safeAddress)) {
          const safe = this.safes.get(safeAddress);
          await safe?.updateInfo();
        } else {
          this.log.debug(`Initializing new safe at address ${safeAddress}`, {
            safeAddress,
          });
          const safe = new Safe(
            {
              transactionQueue: this.transactionQueue,
              geb: this.geb,
              provider: this.provider,
            },
            this.collateral,
            safeAddress,
            this.keeperAddress
          );
          try {
            await safe.init();
            this.safes.set(safeAddress, safe);
            this.log.debug(`Safe initialized at address ${safeAddress}`, {
              safeAddress,
            });
          } catch (err) {
            console.error(err);
          }
        }
      }

      this.cacheBlock = toBlock;
      return this.safes;
    } catch (error) {
      // Log any errors that occur during fetching safes
      this.log.error("Error fetching safes", { error });
      throw error;
    }
  }
}
