import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";
import { Safe } from "../Safe";
import { Collateral } from "../Collateral/collateral";
import { TransactionQueue } from "../TransactionQueue";
import { FlashSwapStrategy } from "../FlashSwap/types";

export interface SafeInfrastructure {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
  transactionQueue: TransactionQueue;
  flashSwapStrategy: FlashSwapStrategy | undefined;
  keeperAddress?: string;
}

export interface ISafeHistoryConfig {
  cacheLookback: number;
  initialCacheBlock: number;
}

export interface ISafeHistoryDependencies {
  infrastructure: SafeInfrastructure;
  collateral: Collateral;
  config: ISafeHistoryConfig;
}

export interface ISafeProvider {
  getSafe(address: string): Promise<Safe>;
}
