import { ethers } from "ethers";
import { Geb, TokenData } from "@hai-on-op/sdk";
import { ICollateralAuctionHouse } from "@hai-on-op/sdk/lib/typechained/ICollateralAuctionHouse.js";

import { Logger } from "pino";
import { getLogger } from "../logger";

import { Collateral } from "../Collateral";

import { CollateralAuction } from "./CollateralAuction";
import { TransactionQueue } from "../TransactionQueue";

interface CollateralAuctionHouseInfrastructure {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
  transactionQueue: TransactionQueue;
}

export class CollateralAuctionHouse {
  provider: ethers.providers.JsonRpcProvider;
  geb: Geb;
  collateral: Collateral;
  transactionQueue: TransactionQueue;
  keeperAddress: string;

  loaded: boolean = false;

  contract: ICollateralAuctionHouse;

  auctions: Array<CollateralAuction> = [];

  log: Logger;

  constructor(
    { provider, geb, transactionQueue }: CollateralAuctionHouseInfrastructure,
    collateral: Collateral,
    keeperAddress: string
  ) {
    this.provider = provider;
    this.geb = geb;
    this.collateral = collateral;
    this.transactionQueue = transactionQueue;

    this.contract =
      this.geb.contracts.tokenCollateralAuctionHouse[
        this.collateral.tokenData.symbol
      ];

    this.log = getLogger(keeperAddress).child({
      module: "CollateralAuctionHouse",
      collateral: this.collateral.tokenData.symbol,
    });

    this.keeperAddress = keeperAddress;
  }

  async loadState() {
    try {
      this.log.info("Initializing collateral auction house");
      await this.handleAuctionsState();
      await this.handleSafeApprovalModification();
      this.loaded = true;
      this.log.info("Collateral auction house initialized");
    } catch (error) {
      this.log.error("Error initializing collateral auction house:", error);
      throw error;
    }
  }

  async reloadState() {
    try {
      this.log.info("Reloading collateral auction house state");
      await this.handleAuctionsState();
      this.log.info("Collateral auction house state reloaded");
    } catch (error) {
      this.log.error("Error reloading collateral auction house state:", error);
      throw error;
    }
  }

  async handleSafeApprovalModification() {
    try {
      const signerAddress = await this.geb.signer?.getAddress();
      const isCollateralApprovedForAddress =
        await this.geb.contracts.safeEngine.safeRights(
          String(signerAddress),
          this.contract.address
        );
      if (!isCollateralApprovedForAddress) {
        this.transactionQueue.addTransaction({
          label: "Collateral auction house's, safe engine approval",
          task: async () => {
            this.log.info(
              "Approving keeper's address to be used by collateral auction house."
            );
            const tx =
              await this.geb.contracts.safeEngine.approveSAFEModification(
                this.contract.address
              );
            await tx.wait();
            this.log.info(
              "Keeper's address approved to be used by collateral auction house."
            );
          },
        });
      } else {
        this.log.info(
          "Keeper's address is already approved to be used by collateral auction house."
        );
      }
    } catch (error) {
      this.log.error("Error handling safe approval modification:", error);
      throw error;
    }
  }

  async handleAuctionsState() {
    try {
      const auctionsStarted = await this.contract.auctionsStarted();
      this.log.debug({
        message: "Handling auctions state",
        auctionsStarted: auctionsStarted.toNumber(),
        existingAuctions: this.auctions.length,
      });

      if (auctionsStarted.toNumber() !== this.auctions.length) {
        const notFollowedActionsIds = Array(
          auctionsStarted.toNumber() - this.auctions.length
        )
          .fill(0)
          .map((v, i) => {
            return ethers.BigNumber.from(this.auctions.length + i + 1);
          });

        this.log.debug({
          message: "Detected new auctions",
          newAuctionIds: notFollowedActionsIds.map((auctionId) =>
            auctionId.toString()
          ),
        });

        for (const auctionId of notFollowedActionsIds) {
          this.log.debug({
            message: "Initializing new auction",
            auctionId: auctionId.toString(),
          });

          const auction = new CollateralAuction(
            this.transactionQueue,
            auctionId,
            this.contract,
            this.geb.contracts.safeEngine,
            this.collateral,
            this.keeperAddress
          );
          await auction.init();
          this.auctions.push(auction);
          this.log.debug({
            message: "New auction initialized",
            auctionId: auctionId.toString(),
          });
        }

        for (const auction of this.auctions) {
          if (auction.initiated && !auction.deleted) {
            this.log.debug({
              message: "Reloading existing auction",
              auctionId: auction.id.toString(),
            });
            await auction.reload();
            this.log.debug({
              message: "Existing auction reloaded",
              auctionId: auction.id.toString(),
            });
          }
        }
      }
    } catch (error) {
      this.log.error("Error handling auctions state:", error);
      throw error;
    }
  }
}
