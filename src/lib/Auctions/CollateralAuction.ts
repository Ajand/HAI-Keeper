import { ethers } from "ethers";
import { ICollateralAuctionHouse } from "@hai-on-op/sdk/lib/typechained/ICollateralAuctionHouse.js";

export class CollateralAuction {
  id: ethers.BigNumber;
  contract: ICollateralAuctionHouse;

  constructor(id: ethers.BigNumber, contract: ICollateralAuctionHouse) {
    this.id = id;
    this.contract = contract;
  }
}
