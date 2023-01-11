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
    console.info("Initializing collateral auction house");
    await this.handleAuctionsState();
    await this.handleSafeApprovalModification();
    this.loaded = true;
    console.info("Collateral auction house initialized");
  }

  async reloadState() {
    console.info("Reloading collateral auction house state");
    await this.handleAuctionsState();
    console.info("Collateral auction house state reloaded");
  }

  async handleSafeApprovalModification() {
    const signerAddress = await this.geb.signer?.getAddress();
    const isCollateralApprovedForAddress =
      await this.geb.contracts.safeEngine.safeRights(
        String(signerAddress),
        this.contract.address
      );
    if (!isCollateralApprovedForAddress) {
      console.info(
        "Approving keeper's address to be used by collateral auction house."
      );
      const tx = await this.geb.contracts.safeEngine.approveSAFEModification(
        this.contract.address
      );
      await tx.wait();
      console.info(
        "Keeper's address approved to be used by collateral auction house."
      );
    } else {
      console.info(
        "Keeper's address is already approved to be used by collateral auction house."
      );
    }
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
        this.auctions.push(
          new CollateralAuction(
            auctionId,
            this.contract,
            this.geb.contracts.safeEngine,
            this.collateral
          )
        );
      });

      for (const auction of this.auctions) {
        console.log(auction.auctionData);
        if (auction.initiated && !auction.deleted) {
          await auction.reload();
        }
      }
    }
  }
}
