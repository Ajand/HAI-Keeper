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

  deleted: boolean = false;

  auctionData: CollateralAuctionData | undefined;

  constructor(id: ethers.BigNumber, contract: ICollateralAuctionHouse) {
    this.id = id;
    this.contract = contract;

    this.init();
  }

  async init() {
    console.log("initiating the auction");

    this.auctionData = await this.contract.auctions(this.id);

    console.log(this.auctionData);
  }
}
