import { ethers } from "ethers";
import { Geb, TokenData } from "@hai-on-op/sdk";
import { ICollateralAuctionHouse } from "@hai-on-op/sdk/lib/typechained/ICollateralAuctionHouse.js";

import { Collateral } from "../Collateral";

import { CollateralAuction } from "./CollateralAuction";

interface CollateralAuctionHouseInfrastructure {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
}

export class CollateralAuctionHouse {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
  collateral: Collateral;

  loaded: boolean = false;

  contract: ICollateralAuctionHouse;

  auctions: Array<CollateralAuction> = [];

  constructor(
    { provider, geb }: CollateralAuctionHouseInfrastructure,
    collateral: Collateral
  ) {
    this.provider = provider;
    this.geb = geb;
    this.collateral = collateral;

    this.contract =
      this.geb.contracts.tokenCollateralAuctionHouse[
        this.collateral.tokenData.symbol
      ];

    this.loadState();
  }

  async loadState() {
    console.log("loading state ...");
    await this.handleAuctionsState();
  }

  async reloadState() {
    console.log("reloading state ...");
    await this.handleAuctionsState();
  }

  async handleAuctionsState() {
    const auctionsStarted = await this.contract.auctionsStarted();
    if (auctionsStarted.toNumber() !== this.auctions.length) {
      const notFollowedActionsIds = Array(
        auctionsStarted.toNumber() - this.auctions.length
      )
        .fill(0)
        .map((v, i) => {
          return ethers.BigNumber.from(this.auctions.length + i + 1);
        });
      notFollowedActionsIds.forEach((auctionId) => {
        this.auctions.push(new CollateralAuction(auctionId, this.contract));
      });
    }
  }
}
