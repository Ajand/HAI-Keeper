import { ArgsParser } from "./Initializer";
import { ethers, utils as ethersUtils } from "ethers";
import { Geb, utils } from "@hai-on-op/sdk";
import { KeyPassSplitter, createWallet } from "./Initializer/SignerFactory";
import { getPastSafeModifications } from "./EventHandlers";
import { NonceManager } from "@ethersproject/experimental";
import * as types from "@hai-on-op/sdk/lib/typechained";
import { fromEvent } from "rxjs";

import { TransactionQueue } from "../lib/TransactionQueue";

import { NativeBalance } from "../lib";

import { Collateral, SafeHistory, CollateralAuctionHouse } from "../lib";

import { WadFromRad } from "../lib/Math";

interface KeeperOverrides {
  provider?: ethers.providers.JsonRpcProvider;
  signer?: ethers.Signer;
}

export const sleep = async (timeout: number) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => resolve(), timeout);
  });
};

export enum KeeperStatus {
  Initating,
  Paused,
  Working,
  Stopped,
}

export class Keeper {
  args;
  provider: ethers.providers.JsonRpcProvider;
  signer: ethers.Wallet;
  geb: Geb;

  transactionQueue: TransactionQueue;
  collateral: Collateral;
  safeHistory: SafeHistory;

  collateralAuctionHouse: CollateralAuctionHouse;
  chunkSize: number;

  liquidatedSafes: Set<string> = new Set();

  startupFinished: boolean = false;

  nativeBalance: NativeBalance;

  coinBalance: ethers.BigNumber = ethers.BigNumber.from(0); // RAD
  collateralBalance: ethers.BigNumber = ethers.BigNumber.from(0); // WAD

  isBidding: boolean;
  isLiquidating: boolean;

  isExiting: boolean = false;

  keepSystemCoinInSafeEngine: boolean;
  keepCollateralInSafeEngine: boolean;

  constructor(argsList: string[], overrides: KeeperOverrides = {}) {
    this.args = ArgsParser(argsList);

    this.provider = overrides.provider
      ? overrides.provider
      : new ethers.providers.JsonRpcProvider(this.args["--rpc-uri"]);

    const keyFile = KeyPassSplitter(String(this.args["--eth-key"]));
    const wallet = createWallet(keyFile).connect(this.provider);

    this.transactionQueue = new TransactionQueue(10);

    console.info(`Keeper will interact as this address: ${wallet.address}`);

    this.signer = wallet.connect(this.provider);

    const testingNetwork = "optimism-sepolia";
    const network = this.args["--network"];
    if (network) {
      this.geb = new Geb(network, this.signer);
    } else {
      this.geb = new Geb(testingNetwork, this.signer);
    }
    console.info(`Geb initiated on the ${network} network`);

    if (!this.args["--collateral-type"]) {
      this.collateral = new Collateral(
        { provider: this.provider, geb: this.geb },
        this.geb.tokenList.WETH
      );
      this.collateral.init();
    } else {
      this.collateral = new Collateral(
        { provider: this.provider, geb: this.geb },
        this.geb.tokenList[this.args["--collateral-type"]]
      );
      this.collateral.init();
    }

    this.chunkSize = Number(this.args["--chunk-size"]);

    this.safeHistory = new SafeHistory(
      {
        provider: this.provider,
        geb: this.geb,
        transactionQueue: this.transactionQueue,
      },
      this.collateral,
      Number(this.args["--from-block"])
    );

    this.collateralAuctionHouse = new CollateralAuctionHouse(
      {
        provider: this.provider,
        geb: this.geb,
        transactionQueue: this.transactionQueue,
      },
      this.collateral
    );

    // Setting up the keeper setup props
    this.isBidding = this.args["--start-auctions-only"] ? false : true;
    this.isLiquidating = this.args["--bid-only"] ? false : true;
    this.keepSystemCoinInSafeEngine = this.args[
      "--keep-system-coin-in-safe-engine-on-exit"
    ]
      ? true
      : false;
    this.keepCollateralInSafeEngine = this.args[
      "--keep-collateral-in-safe-engine-on-exit"
    ]
      ? true
      : false;

    this.nativeBalance = new NativeBalance(this.provider, wallet, 5000);

    this.handleLifeCycle();
  }

  async handleLifeCycle() {
    // startup logic

    await this.startup();

    // on each block logic
    let processedBlock: number;
    let isProcessing = false;

    let isNotEnoughNativeBalanceLogged = false;
    let isNotEnoughSystemCoinBalanceLogged = false;
    let notBiddingLog = false;

    const minNativeBalance = ethers.utils.parseEther("0.005");
    const minSystemCoinBalance = ethers.utils.parseEther("0.1");

    this.provider.on("block", async () => {
      const nativeBalance = this.nativeBalance.value$.getValue();
      await this.getSystemCoinBalance();

      if (this.startupFinished && !this.isExiting) {
        if (nativeBalance && nativeBalance.lt(minNativeBalance)) {
          // not enough native balance flow
          if (!isNotEnoughNativeBalanceLogged) {
            console.warn(
              `Native balance of the system is less than minimum needed. Keeper will stop it's operation `
            );
            isNotEnoughNativeBalanceLogged = true;
          }
        } else {
          // normal flow
          const currentBlockNumber = await this.provider.getBlockNumber();
          if (processedBlock !== currentBlockNumber && !isProcessing) {
            isProcessing = true;
            try {
              if (this.isLiquidating) {
                this.checkSafes();
              }
              if (this.collateralAuctionHouse.loaded) {
                await this.collateralAuctionHouse.reloadState();
                isNotEnoughNativeBalanceLogged = false;
              }
            } catch (err) {
              console.error(err);
            }

            processedBlock = await this.provider.getBlockNumber();
            isProcessing = false;

            if (!this.isBidding) {
              console.warn(`This keeper will not participate in auctions.`);
              notBiddingLog = true;
            } else if (this.coinBalance.gt(minSystemCoinBalance)) {
              notBiddingLog = false;
              isNotEnoughSystemCoinBalanceLogged = false;
              this.handleBidding();
            } else if (!isNotEnoughSystemCoinBalanceLogged) {
              console.warn(
                `System coin balance of the system is less than minimum needed. Keeper will stop bidding `
              );
              isNotEnoughSystemCoinBalanceLogged = true;
            }
          }
        }
      }
    });
  }

  async startup() {
    if (this.isBidding) {
      console.info("This keeper bids in auctions if it finds an opportunity");
    } else {
      console.warn("This keeper won't bid in auctions!");
    }

    if (this.isLiquidating) {
      console.info("This keeper liquidate safes if it find an opportunity");
    } else {
      console.warn("This keeper won't liquidate safes!");
    }

    await this.approveSystemCoinForJoinCoin();

    await this.collateralAuctionHouse.loadState();
    await this.joinSystemCoins();
    await this.getSystemCoinBalance();
    await this.getCollateralBalance();

    console.info("Initating the fetching initial events of the keeper");

    await this.checkSafes();

    this.startupFinished = true;

    console.info("Initial safe data fetched.");
  }

  async shutdown() {
    console.info("Shutting down the keeper");
    this.isExiting = true;
    if (!this.keepCollateralInSafeEngine) {
      console.info("Keeper is set up to exit collateral on shutdown");
      await this.exitCollateral();
    } else {
      console.info("Keeper is set up to NOT exit collateral on shutdown.");
    }
    if (!this.keepSystemCoinInSafeEngine) {
      console.info("Keeper is set up to exit system coin on shutdown");
      await this.exitSystemCoin();
    } else {
      console.info("Keeper is set up to NOT exit system coin on shutdown.");
    }
  }

  async approveSystemCoinForJoinCoin() {
    const joinCoin = this.geb.contracts.joinCoin;

    const systemCoin = this.geb.contracts.systemCoin;

    const currentAllowance = await systemCoin.allowance(
      this.signer.address,
      joinCoin.address
    );

    if (currentAllowance.eq(0)) {
      this.transactionQueue.addTransaction({
        label: "System Coin Approval",
        task: async () => {
          console.info("Approving system coin to be used by coin join.");
          const tx = await systemCoin.approve(
            joinCoin.address,
            ethers.constants.MaxUint256
          );
          await tx.wait();
          console.info(
            "Approved keeper's system coins to be used by coin join."
          );
        },
      });
    } else {
      console.info(
        "Skipping the approval for system coin to be used by coin join, because it is already approved."
      );
    }
  }

  async joinSystemCoins() {
    console.info("Joining the coins to the coin join.");
    const joinCoin = this.geb.contracts.joinCoin;
    const systemCoin = this.geb.contracts.systemCoin;
    const keeperBalance = await systemCoin.balanceOf(this.signer.address);
    if (keeperBalance.eq(0)) {
      await this.getSystemCoinBalance();
      if (this.coinBalance.eq(0)) {
        return console.warn(
          "There is no system coin in the keeper. The keeper can not participate in the auctions."
        );
      } else {
        return console.info(
          "All of the system coin is already joined. Skipping the joining."
        );
      }
    }

    this.transactionQueue.addTransaction({
      label: "Joining system coin",
      task: async () => {
        console.info("Joining system coin to be used by coin join.");
        const tx = await joinCoin.join(this.signer.address, keeperBalance);
        await tx.wait();
        console.info(`Joined ${keeperBalance} system coin.`);
        await this.getSystemCoinBalance();
      },
    });
  }

  async exitCollateral() {
    const collateralJoin = types.ICollateralJoin__factory.connect(
      this.collateral.tokenData.collateralJoin,
      this.signer
    );

    this.transactionQueue.addTransaction({
      label: "Collateral Exit",
      task: async () => {
        await this.getCollateralBalance();

        console.info("Exiting the collateral from the coin join.");
        const tx = await collateralJoin.exit(
          this.signer.address,
          this.collateralBalance
        );
        await tx.wait();
        console.info(
          `Exited ${this.collateralBalance} collaterals from the collateral join.`
        );
        await this.getCollateralBalance();
      },
    });
  }

  async exitSystemCoin() {
    const joinCoin = this.geb.contracts.joinCoin;
    await this.handleSafeApprovalForExit();

    this.transactionQueue.addTransaction({
      label: "System coin exit",
      task: async () => {
        await this.getSystemCoinBalance();

        console.info("Exiting the system coins from the coin join.");
        const tx = await joinCoin.exit(
          this.signer.address,
          WadFromRad(this.coinBalance)
        );
        await tx.wait();
        console.info(
          `Exited ${this.coinBalance} system coin from the coin join.`
        );
        await this.getSystemCoinBalance();
      },
    });
  }

  async handleSafeApprovalForExit() {
    const joinCoin = this.geb.contracts.joinCoin;

    const isCollateralApprovedForAddress =
      await this.geb.contracts.safeEngine.safeRights(
        String(this.signer.address),
        joinCoin.address
      );

    if (!isCollateralApprovedForAddress) {
      this.transactionQueue.addTransaction({
        label: "Safe Approval to exit",
        task: async () => {
          console.info(
            "Approving keeper's address to be able exit system by coin join."
          );
          const tx =
            await this.geb.contracts.safeEngine.approveSAFEModification(
              joinCoin.address
            );
          await tx.wait();
          console.info("Keeper's address approved to be used by coin join.");
        },
      });
    } else {
      console.info(
        "Keeper's address is already approved to be used by coin join."
      );
    }
  }

  async getSystemCoinBalance() {
    this.coinBalance = await this.geb.contracts.safeEngine.coinBalance(
      this.signer.address
    );
  }

  async getCollateralBalance() {
    console.info("Getting collateral balance");
    this.collateralBalance =
      await this.geb.contracts.safeEngine.tokenCollateral(
        this.collateral.tokenData.bytes32String,
        this.signer.address
      );
    console.info(
      `Keeper collateral balance updated, ${this.collateralBalance}`
    );
  }

  async checkSafes() {
    console.log("checking safe ....");
    if (this.collateral.initialized) {
      await this.collateral.updateInfo();
    } else {
      await this.collateral.init();
    }

    const safes = await this.safeHistory.getSafes(this.chunkSize);

    const safesArray = [...safes].map((safe) => safe[1]);

    for (const safe of safesArray) {
      if (safe.canLiquidate()) {
        try {
          const receipt = await safe.liquidate();

          const liquidateEvent = receipt?.events?.find(
            (ev) => ev.event === "Liquidate"
          );

          if (liquidateEvent?.args?._safe) {
            this.liquidatedSafes.add(liquidateEvent?.args?._safe);
          }
        } catch (err) {
          console.error("Failed to liquidated safe: ", safe.address);
        }
      } else {
        console.info("can not liquidate safe: ", safe.address);
      }
    }
  }

  // TODO: This should be removed
  //async getSafes() {
  //  const startingBlock = Number(this.args["--from-block"]);
  //  const endBlock = (await this.provider.getBlock("latest")).number;
  //
  //  return getPastSafeModifications({
  //    geb: this.geb,
  //    provider: this.provider,
  //  })(startingBlock, endBlock, "");
  //}

  async handleBidding() {
    await this.collateralAuctionHouse.handleAuctionsState();

    const auctions = this.collateralAuctionHouse.auctions;

    // Must add proper money management tool
    for (const auction of auctions) {
      if (!auction.deleted) {
        await this.getSystemCoinBalance();
        if (this.coinBalance.eq(0)) {
          console.warn(
            `Our system coin balance is zero. There is an opportunity to buy collateral but we can not bid.`
          );
        } else {
          await auction.buy(WadFromRad(this.coinBalance));
          await auction.reload();
        }
      }
    }
  }
}

export default Keeper;
