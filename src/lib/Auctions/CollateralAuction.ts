import { ethers } from "ethers";
import { ICollateralAuctionHouse } from "@hai-on-op/sdk/lib/typechained/ICollateralAuctionHouse.js";
import { ISAFEEngine } from "@hai-on-op/sdk/lib/typechained/ISAFEEngine.js";
import { Collateral } from "../Collateral";
import { Logger } from "pino";
import { getLogger } from "../logger";

import { FormatWad } from "../Math";

import { TransactionQueue } from "../TransactionQueue";

export interface CollateralAuctionData {
  amountToSell: ethers.BigNumber;
  amountToRaise: ethers.BigNumber;
  initialTimestamp: ethers.BigNumber;
  forgoneCollateralReceiver: string;
  auctionIncomeRecipient: string;
}

export class CollateralAuction {
  transactionQueue: TransactionQueue;
  id: ethers.BigNumber;
  contract: ICollateralAuctionHouse;
  safeEngine: ISAFEEngine;
  collateral: Collateral;

  //deleted: boolean = false;

  initiated: boolean = false;
  auctionData: CollateralAuctionData | undefined;

  log: Logger;

  constructor(
    transacationQueue: TransactionQueue,
    id: ethers.BigNumber,
    contract: ICollateralAuctionHouse,
    safeEngine: ISAFEEngine,
    collateral: Collateral,
    keeperAddress: string
  ) {
    this.transactionQueue = transacationQueue;
    this.id = id;
    this.contract = contract;
    this.safeEngine = safeEngine;
    this.collateral = collateral;

    // Create a child logger for this module
    this.log = getLogger(keeperAddress).child({
      module: "CollateralAuction",
      id: this.id,
      contract: contract.address,
      collateral: this.collateral.tokenData.symbol,
    });
  }

  async init() {
    try {
      this.log.debug({
        message: "Initializing Collateral Auction",
        auctionId: this.id.toString(),
      });
      this.auctionData = await this.contract.auctions(this.id);
      this.initiated = true;
      this.log.debug({
        message: "Collateral Auction initialized successfully",
        auctionData: this.auctionData,
      });
    } catch (error) {
      this.log.error({
        message: "Error initializing Collateral Auction",
        error: error,
      });
      throw error;
    }
  }

  async reload() {
    try {
      this.log.debug({
        message: "Reloading Collateral Auction data",
        auctionId: this.id.toString(),
      });
      this.auctionData = await this.contract.auctions(this.id);
      this.log.debug({
        message: "Collateral Auction data reloaded successfully",
        auctionData: this.auctionData,
      });
    } catch (error) {
      this.log.error({
        message: "Error reloading Collateral Auction data",
        error: error,
      });
      throw error;
    }
  }

  public get deleted(): boolean {
    // TODO: This need to be improved
    // Need to handle reorg
    if (!this.auctionData) return false;
    if (this.auctionData.amountToSell.eq(0)) {
      return true;
    }
    return false;
  }

  async buy(amount: ethers.BigNumber) {
    try {
      this.transactionQueue.addTransaction({
        label: "Buying Collateral",
        task: async () => {
          this.log.debug({
            message: `Buying ${
              this.collateral.tokenData.symbol
            } with ${FormatWad(amount)} system coin`,
            auctionId: this.id.toString(),
            amount: FormatWad(amount),
          });
          const tx = await this.contract.buyCollateral(this.id, amount);
          await tx.wait();

          // TODO: add more info in this log
          this.log.info({
            message: `Successfully bought ${
              this.collateral.tokenData.symbol
            } with ${FormatWad(amount)} system coin`,
            auctionId: this.id.toString(),
            amount: FormatWad(amount),
          });
        },
      });
    } catch (error) {
      this.log.error({
        message: "Error buying collateral",
        error: error,
      });
      throw error;
    }
  }
}
