import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";

import { Safe } from "../Safe";
import { Collateral } from "../Collateral";
import { TransactionQueue } from "../TransactionQueue";
import { getPastSafeModifications } from "../../Keeper/EventHandlers";

interface SafeInfrustructure {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
  transactionQueue: TransactionQueue;
}

export class SafeHistory {
  transactionQueue: TransactionQueue;
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
  collateral: Collateral;

  cacheLookback = 12; // for handling block reorgs
  cacheBlock: number;

  safes: Map<string, Safe> = new Map();

  constructor(
    { provider, geb, transactionQueue }: SafeInfrustructure,
    collateral: Collateral,
    from: number
  ) {
    this.transactionQueue = transactionQueue;
    this.provider = provider;
    this.geb = geb;
    this.collateral = collateral;
    this.cacheBlock = from;
    console.info("Safe history instance created.");
  }

  async getSafes(chunkSize: number) {
    const safeAddresses = new Set();
    let mods = [];

    const fromBlock = Math.max(0, this.cacheBlock - this.cacheLookback);
    const toBlock = await this.provider.getBlockNumber();

    mods = await getPastSafeModifications({
      geb: this.geb,
      provider: this.provider,
    })(fromBlock, toBlock, this.collateral, chunkSize);

    for (const mod of mods) {
      const safeAddress = mod.args._safe;

      safeAddresses.add(safeAddress);

      if (this.safes.has(safeAddress)) {
        const safe = this.safes.get(safeAddress);
        await safe?.updateInfo();
      } else {
        const safe = new Safe(
          {
            transactionQueue: this.transactionQueue,
            geb: this.geb,
            provider: this.provider,
          },
          this.collateral,
          safeAddress
        );
        try {
          await safe.init();
          this.safes.set(safeAddress, safe);
        } catch (err) {
          console.error(err);
        }
      }
    }

    this.cacheBlock = toBlock;
    return this.safes;
  }
}
