import { ethers } from "ethers";
import { ICollateralAuctionHouse } from "@hai-on-op/sdk/lib/typechained/ICollateralAuctionHouse.js";

export interface CollateralAuctionData {
  amountToSell: ethers.BigNumber;
  amountToRaise: ethers.BigNumber;
  initialTimestamp: ethers.BigNumber;
  forgoneCollateralReceiver: string;
  auctionIncomeRecipient: string;
}

export class CollateralAuction {
  id: ethers.BigNumber;
  contract: ICollateralAuctionHouse;

  //deleted: boolean = false;

  initiated: boolean = false;
  auctionData: CollateralAuctionData | undefined;

  constructor(id: ethers.BigNumber, contract: ICollateralAuctionHouse) {
    this.id = id;
    this.contract = contract;

    this.init();
  }

  async init() {
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
}
