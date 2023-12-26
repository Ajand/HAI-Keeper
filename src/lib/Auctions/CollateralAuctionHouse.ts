import { ethers } from "ethers";
import { Geb, TokenData } from "@hai-on-op/sdk";
import { ICollateralAuctionHouse } from "@hai-on-op/sdk/lib/typechained/ICollateralAuctionHouse.js";

import { Collateral } from "../Collateral";

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
  }

  async reloadState() {
    console.log("reloading state ...");

    console.log(this.collateral.tokenData.symbol, this.contract.address);
    console.log(await this.contract.auctionsStarted());
  }

  async getAuctionsStarted() {}
}
