import { ethers } from "ethers";
import { ICollateralAuctionHouse } from "@hai-on-op/sdk/lib/typechained/ICollateralAuctionHouse.js";
import { ISAFEEngine } from "@hai-on-op/sdk/lib/typechained/ISAFEEngine.js";
import { Collateral } from "../Collateral";

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

  constructor(
    transacationQueue: TransactionQueue,
    id: ethers.BigNumber,
    contract: ICollateralAuctionHouse,
    safeEngine: ISAFEEngine,
    collateral: Collateral
  ) {
    this.transactionQueue = transacationQueue;
    this.id = id;
    this.contract = contract;
    this.safeEngine = safeEngine;
    this.collateral = collateral;
  }

  async init() {
    console.log(this.id);
    this.auctionData = await this.contract.auctions(this.id);
    this.initiated = true;
  }

  async reload() {
    this.auctionData = await this.contract.auctions(this.id);
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
    this.transactionQueue.addTransaction({
      label: "Buying Collateral",
      task: async () => {
        console.info(
          `Buying ${this.collateral.tokenData.symbol} with ${FormatWad(
            amount
          )} system coin `
        );
        const tx = await this.contract.buyCollateral(this.id, amount);
        await tx.wait();

        // TODO: add more info in this log
        console.info(
          `Successfully bought ${
            this.collateral.tokenData.symbol
          } with ${FormatWad(amount)} system coin `
        );
      },
    });
  }
}
