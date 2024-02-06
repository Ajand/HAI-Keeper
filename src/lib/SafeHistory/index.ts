import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";

import { Safe } from "../Safe";
import { Collateral } from "../Collateral";
import { getPastSafeModifications } from "../../Keeper/EventHandlers";
import { TransactionQueue } from "../TransactionQueue";

interface SafeInfrustructure {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
  transactionQueue: TransactionQueue;
}

export class SafeHistory {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
  transactionQueue: TransactionQueue;
  collateral: Collateral;

  cacheLookback = 12; // for handling block reorgs
  cacheBlock: number;

  safes: Map<string, Safe> = new Map();

  constructor(
    { provider, geb, transactionQueue }: SafeInfrustructure,
    collateral: Collateral,
    from: number
  ) {
    this.provider = provider;
    this.geb = geb;
    this.transactionQueue = transactionQueue;

    this.collateral = collateral;
    this.cacheBlock = from;
    console.info("Safe history instance created.");
  }

  async getSafes() {
    const safeAddresses = new Set();
    let mods = [];

    const fromBlock = Math.max(0, this.cacheBlock - this.cacheLookback);
    const toBlock = await this.provider.getBlockNumber();

    mods = await getPastSafeModifications({
      geb: this.geb,
      provider: this.provider,
    })(fromBlock, toBlock, this.collateral, 2000);

    for (const mod of mods) {
      const safeAddress = mod.args._safe;

      safeAddresses.add(safeAddress);

      if (this.safes.has(safeAddress)) {
        const safe = this.safes.get(safeAddress);
        await safe?.update();
      } else {
        const safe = new Safe(
          {
            geb: this.geb,
            provider: this.provider,
            transactionQueue: this.transactionQueue,
          },
          this.collateral,
          safeAddress
        );
        try {
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
