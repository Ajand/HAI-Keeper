import { ArgsParser } from "./Initializer";
import { ethers, utils as ethersUtils } from "ethers";
import { Geb, utils } from "@hai-on-op/sdk";
import { KeyPassSplitter, createWallet } from "./Initializer/SignerFactory";
import { getPastSafeModifications } from "./EventHandlers";
import { NonceManager } from "@ethersproject/experimental";
import * as types from "@hai-on-op/sdk/lib/typechained";
import { fromEvent } from "rxjs";

import { Logger } from "pino";
import { getLogger } from "../lib/logger";

import { TransactionQueue } from "../lib/TransactionQueue";

import { NativeBalance } from "../lib";

import { Collateral, SafeHistory, CollateralAuctionHouse } from "../lib";

import { WadFromRad } from "../lib/Math";

import { FlashSwapStrategy } from "../lib/FlashSwap/types";
import { flashSwapStrategyFactory } from "../lib/FlashSwap/strategyFactory";
import { flashSwpaProxyConfigurations } from "./configs/flashSwapProxyConfig";

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
  Initializing,
  Started,
  Stopping,
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

  log: Logger;

  status: KeeperStatus;

  flashSwapStrategy: FlashSwapStrategy | undefined;

  lifeCycleHandler: EventListener | undefined;

  constructor(argsList: string[], overrides: KeeperOverrides = {}) {
    this.status = KeeperStatus.Initializing;

    this.args = ArgsParser(argsList);

    this.provider = overrides.provider
      ? overrides.provider
      : new ethers.providers.JsonRpcProvider(this.args["--rpc-uri"]);

    const keyFile = KeyPassSplitter(String(this.args["--eth-key"]));
    const wallet = createWallet(keyFile).connect(this.provider);

    this.log = getLogger(wallet.address).child({ module: "Keeper" });

    this.transactionQueue = new TransactionQueue(10, wallet.address);
    this.log.info(`Transaction queue initiated`);

    this.signer = wallet.connect(this.provider);
    this.log.info(`Keeper will interact as this address: ${wallet.address}`, {
      walletAddress: wallet.address,
    });

    const testingNetwork = "mainnet";
    const network = this.args["--network"];
    if (network) {
      this.geb = new Geb(network, this.signer);
    } else {
      this.geb = new Geb(testingNetwork, this.signer);
    }
    this.log.info(`Geb initiated on the ${network} network`, { network });

    const inputCollateralType = this.args["--collateral-type"]
      ? this.args["--collateral-type"]
      : "WETH";

    this.collateral = new Collateral(
      { provider: this.provider, geb: this.geb },
      this.geb.tokenList[inputCollateralType],
      this.signer.address
    );
    this.collateral.init();
    this.log.info(`Collateral initialized: ${this.args["--collateral-type"]}`, {
      collateralType: this.args["--collateral-type"],
    });

    const flashSwap = this.args["--flash-swap"];

    console.log(flashSwap);

    if (!!flashSwap) {
      const flashSwapNetwork = network ? network : testingNetwork;

      this.flashSwapStrategy = flashSwapStrategyFactory(
        inputCollateralType,
        wallet,
        flashSwpaProxyConfigurations[flashSwapNetwork]
      );
    }

    this.chunkSize = Number(this.args["--chunk-size"]);

    this.safeHistory = new SafeHistory(
      {
        provider: this.provider,
        geb: this.geb,
        transactionQueue: this.transactionQueue,
        keeperAddress: this.signer.address,
        flashSwapStrategy: this.flashSwapStrategy,
      },
      this.collateral,
      Number(this.args["--from-block"])
    );
    this.log.info(`Safe history initialized`);

    this.collateralAuctionHouse = new CollateralAuctionHouse(
      {
        provider: this.provider,
        geb: this.geb,
        transactionQueue: this.transactionQueue,
      },
      this.collateral,
      this.signer.address
    );
    this.log.info(`Collateral auction house initialized`);

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

    this.log.info(`Keeper setup properties configured`, {
      isBidding: this.isBidding,
      isLiquidating: this.isLiquidating,
      keepSystemCoinInSafeEngine: this.keepSystemCoinInSafeEngine,
      keepCollateralInSafeEngine: this.keepCollateralInSafeEngine,
    });

    this.nativeBalance = new NativeBalance(this.provider, wallet, 5000);
    this.log.info(`Native balance initialized with interval 5000ms`);

    this.start();
  }

  async start() {
    this.log.info("Starting keeper");
    this.handleLifeCycle();
    this.log.info(`Lifecycle management initiated`);
  }

  async handleLifeCycle() {
    try {
      // startup logic

      await this.startup();
      this.log.debug("Startup logic executed");

      // on each block logic
      let processedBlock: number;
      let isProcessing = false;

      let isNotEnoughNativeBalanceLogged = false;
      let isNotEnoughSystemCoinBalanceLogged = false;
      let notBiddingLog = false;

      const minNativeBalance = ethers.utils.parseEther("0.005");
      const minSystemCoinBalance = ethers.utils.parseEther("0.1");

      this.status = KeeperStatus.Started;

      this.lifeCycleHandler = async () => {
        this.log.trace("Block event received");
        const nativeBalance = this.nativeBalance.value$.getValue();
        await this.getSystemCoinBalance();

        if (this.startupFinished && !this.isExiting) {
          this.log.debug("Startup finished, processing blocks");
          if (nativeBalance && nativeBalance.lt(minNativeBalance)) {
            console.log(
              "block received",
              nativeBalance, 
              minNativeBalance,
              nativeBalance && nativeBalance.lt(minNativeBalance)
            );

            // not enough native balance flow
            if (!isNotEnoughNativeBalanceLogged) {
              this.log.warn(
                "Native balance of the system is less than minimum needed. Keeper will stop its operation",
                {
                  nativeBalance: ethers.utils.formatEther(nativeBalance),
                  minNativeBalance: ethers.utils.formatEther(minNativeBalance),
                }
              );
              isNotEnoughNativeBalanceLogged = true;
            }
          } else {
            // normal flow
            const currentBlockNumber = await this.provider.getBlockNumber();
            this.log.trace(`Current block number: ${currentBlockNumber}`, {
              currentBlockNumber,
            });
            if (processedBlock !== currentBlockNumber && !isProcessing) {
              this.log.debug("New block detected, processing");
              isProcessing = true;
              try {
                if (this.isLiquidating) {
                  this.checkSafes();
                }
                if (this.collateralAuctionHouse.loaded) {
                  await this.collateralAuctionHouse.reloadState();
                  isNotEnoughNativeBalanceLogged = false;
                }
                this.log.trace("Block processing completed");
              } catch (err) {
                this.log.error("Error processing blocks", { error: err });
              }

              processedBlock = await this.provider.getBlockNumber();
              isProcessing = false;

              if (!this.isBidding) {
                this.log.warn("This keeper will not participate in auctions.");
                notBiddingLog = true;
              } else if (this.coinBalance.gt(minSystemCoinBalance)) {
                notBiddingLog = false;
                isNotEnoughSystemCoinBalanceLogged = false;
                this.handleBidding();
              } else if (!isNotEnoughSystemCoinBalanceLogged) {
                this.log.warn(
                  "System coin balance of the system is less than minimum needed. Keeper will stop bidding"
                );

                isNotEnoughSystemCoinBalanceLogged = true;
              }
            }
          }
        }
      };

      this.provider.on("block", this.lifeCycleHandler);
      this.log.debug("Block event listener initialized");
    } catch (error) {
      this.log.error("Error handling lifecycle", { error });
      throw error;
    }
  }

  async startup() {
    try {
      if (this.isBidding) {
        this.log.info(
          "This keeper bids in auctions if it finds an opportunity",
          {
            method: "startup",
          }
        );
      } else {
        this.log.warn("This keeper won't bid in auctions!", {
          method: "startup",
        });
      }

      if (this.isLiquidating) {
        this.log.info(
          "This keeper liquidates safes if it finds an opportunity",
          {
            method: "startup",
          }
        );
      } else {
        this.log.warn("This keeper won't liquidate safes!", {
          method: "startup",
        });
      }

      await this.approveSystemCoinForJoinCoin();
      this.log.debug("System coin approved for join coin", {
        method: "startup",
      });

      await this.collateralAuctionHouse.loadState();
      this.log.debug("Collateral auction house state loaded", {
        method: "startup",
      });

      await this.joinSystemCoins();
      this.log.debug("System coins joined", {
        method: "startup",
      });

      await this.getSystemCoinBalance();
      this.log.debug("System coin balance fetched", {
        method: "startup",
      });

      await this.getCollateralBalance();
      this.log.debug("Collateral balance fetched", {
        method: "startup",
      });

      this.log.info(
        "Initiating the fetching of initial events for the keeper",
        {
          method: "startup",
        }
      );

      await this.checkSafes();
      this.log.debug("Initial safe data fetched", {
        method: "startup",
      });

      this.startupFinished = true;
      this.log.info("Initial safe data fetched.", {
        method: "startup",
      });
    } catch (error) {
      this.log.error("Error during startup", { error, method: "startup" });
      throw error;
    }
  }

  async shutdown() {
    try {
      this.log.info("Shutting down the keeper");
      this.status = KeeperStatus.Stopping;
      this.isExiting = true;
      if (!this.keepCollateralInSafeEngine) {
        this.log.info("Keeper is set up to exit collateral on shutdown", {
          method: "shutdown",
        });
        await this.exitCollateral();
      } else {
        this.log.info("Keeper is set up to NOT exit collateral on shutdown.", {
          method: "shutdown",
        });
      }
      if (!this.keepSystemCoinInSafeEngine) {
        this.log.info("Keeper is set up to exit system coin on shutdown", {
          method: "shutdown",
        });
        await this.exitSystemCoin();
      } else {
        this.log.info("Keeper is set up to NOT exit system coin on shutdown.", {
          method: "shutdown",
        });
      }

      if (this.lifeCycleHandler) {
        this.provider.off("block", this.lifeCycleHandler);
      }

      this.status = KeeperStatus.Stopped;
    } catch (error) {
      this.log.error("Error during shutdown", { error });
      throw error;
    }
  }

  async approveSystemCoinForJoinCoin() {
    try {
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
            this.log.info("Approving system coin to be used by coin join.", {
              method: "approveSystemCoinForJoinCoin",
            });
            const tx = await systemCoin.approve(
              joinCoin.address,
              ethers.constants.MaxUint256
            );
            await tx.wait();
            this.log.info("Approving system coin to be used by coin join.", {
              method: "approveSystemCoinForJoinCoin",
            });
          },
        });
      } else {
        this.log.info(
          "Skipping the approval for system coin to be used by coin join, because it is already approved.",
          {
            method: "approveSystemCoinForJoinCoin",
          }
        );
      }
    } catch (error) {
      this.log.error("Error during approving system coin for join coin", {
        error,
        method: "approveSystemCoinForJoinCoin",
      });
      throw error;
    }
  }

  async joinSystemCoins() {
    try {
      this.log.info("Joining the coins to the coin join.", {
        method: "joinSystemCoins",
      });
      const joinCoin = this.geb.contracts.joinCoin;
      const systemCoin = this.geb.contracts.systemCoin;
      const keeperBalance = await systemCoin.balanceOf(this.signer.address);
      if (keeperBalance.eq(0)) {
        await this.getSystemCoinBalance();
        if (this.coinBalance.eq(0)) {
          this.log.warn(
            "There is no system coin in the keeper. The keeper cannot participate in the auctions.",
            {
              method: "joinSystemCoins",
            }
          );
        } else {
          this.log.info(
            "All of the system coin is already joined. Skipping the joining.",
            {
              method: "joinSystemCoins",
            }
          );
        }
        return;
      }

      this.transactionQueue.addTransaction({
        label: "Joining system coin",
        task: async () => {
          this.log.info("Joining system coin to be used by coin join.", {
            method: "joinSystemCoins",
          });
          const tx = await joinCoin.join(this.signer.address, keeperBalance);
          await tx.wait();
          this.log.info(`Joined ${keeperBalance} system coin.`, {
            keeperBalance,
            method: "joinSystemCoins",
          });
          await this.getSystemCoinBalance();
        },
      });
    } catch (error) {
      this.log.error("Error during joining system coins", {
        error,
        method: "joinSystemCoins",
      });
      throw error;
    }
  }

  async exitCollateral() {
    try {
      const collateralJoin = types.ICollateralJoin__factory.connect(
        this.collateral.tokenData.collateralJoin,
        this.signer
      );

      this.transactionQueue.addTransaction({
        label: "Collateral Exit",
        task: async () => {
          await this.getCollateralBalance();

          this.log.info("Exiting the collateral from the coin join.", {
            method: "exitCollateral",
          });
          const tx = await collateralJoin.exit(
            this.signer.address,
            this.collateralBalance
          );
          await tx.wait();
          this.log.info(
            `Exited ${this.collateralBalance} collaterals from the collateral join.`,
            {
              collateralBalance: ethers.utils.formatEther(
                this.collateralBalance
              ),
              method: "exitCollateral",
            }
          );

          await this.getCollateralBalance();
        },
      });
    } catch (error) {
      this.log.error("Error during collateral exit", {
        error,
        method: "exitCollateral",
      });
      throw error;
    }
  }

  async exitSystemCoin() {
    try {
      const joinCoin = this.geb.contracts.joinCoin;
      await this.handleSafeApprovalForExit();

      this.transactionQueue.addTransaction({
        label: "System coin exit",
        task: async () => {
          await this.getSystemCoinBalance();

          this.log.info("Exiting the system coins from the coin join.", {
            method: "ExitSystemCoin",
            balance: this.coinBalance,
          });
          const tx = await joinCoin.exit(
            this.signer.address,
            WadFromRad(this.coinBalance)
          );
          await tx.wait();
          this.log.info(
            `Exited ${this.coinBalance} system coin from the coin join.`,
            {
              method: "ExitSystemCoin",
              balance: ethers.utils.formatEther(this.coinBalance),
            }
          );

          await this.getSystemCoinBalance();
        },
      });
    } catch (error) {
      this.log.error("Error during system coin exit", {
        error,
        method: "ExitSystemCoin",
      });
      throw error;
    }
  }

  async handleSafeApprovalForExit() {
    try {
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
            this.log.info(
              "Approving keeper's address to be able exit system by coin join.",
              { method: "HandleSafeApprovalForExit" }
            );

            const tx =
              await this.geb.contracts.safeEngine.approveSAFEModification(
                joinCoin.address
              );
            await tx.wait();
            this.log.info(
              "Keeper's address approved to be used by coin join.",
              { method: "HandleSafeApprovalForExit" }
            );
          },
        });
      } else {
        this.log.info(
          "Keeper's address is already approved to be used by coin join.",
          { method: "HandleSafeApprovalForExit" }
        );
      }
    } catch (error) {
      this.log.error("Error during handling safe approval for exit", {
        error,
        method: "HandleSafeApprovalForExit",
      });
      throw error;
    }
  }

  async getSystemCoinBalance() {
    try {
      this.coinBalance = await this.geb.contracts.safeEngine.coinBalance(
        this.signer.address
      );
      this.log.debug("Retrieved system coin balance successfully.", {
        method: "GetSystemCoinBalance",
        coinBalance: ethers.utils.formatEther(this.coinBalance),
      });
    } catch (error) {
      this.log.error("Error while retrieving system coin balance.", {
        error,
        method: "GetSystemCoinBalance",
      });
      throw error;
    }
  }

  async getCollateralBalance() {
    try {
      this.log.info("Getting collateral balance.", {
        method: "GetCollateralBalance",
      });
      this.collateralBalance =
        await this.geb.contracts.safeEngine.tokenCollateral(
          this.collateral.tokenData.bytes32String,
          this.signer.address
        );
      this.log.info(
        `Keeper collateral balance updated: ${this.collateralBalance}`,
        { method: "GetCollateralBalance" }
      );
      this.log.debug("Retrieved collateral balance successfully.", {
        method: "GetCollateralBalance",
        collateralBalance: this.collateralBalance.toString(),
      });
    } catch (error) {
      this.log.error("Error while retrieving collateral balance.", {
        error,
        method: "GetCollateralBalance",
      });
      throw error;
    }
  }

  async checkSafes() {
    try {
      this.log.debug("Checking safes...", { method: "CheckSafes" });
      if (this.collateral.initialized) {
        await this.collateral.updateInfo();
      } else {
        await this.collateral.init();
      }

      console.log("checking safes ....");

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

            this.log.info("Safe liquidated successfully.", {
              method: "CheckSafes",
              safeAddress: safe.address,
            });
          } catch (err) {
            this.log.error("Failed to liquidate safe.", {
              error: err,
              method: "CheckSafes",
              safeAddress: safe.address,
            });
          }
        } else {
          this.log.info("Cannot liquidate safe.", {
            method: "CheckSafes",
            safeAddress: safe.address,
          });
        }
      }
    } catch (error) {
      this.log.error("Error while checking safes.", {
        error,
        method: "CheckSafes",
      });
      throw error;
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
    try {
      await this.collateralAuctionHouse.handleAuctionsState();

      const auctions = this.collateralAuctionHouse.auctions;

      // Must add proper money management tool
      for (const auction of auctions) {
        if (!auction.deleted) {
          await this.getSystemCoinBalance();
          if (this.coinBalance.eq(0)) {
            this.log.warn("System coin balance is zero. Cannot bid.", {
              method: "HandleBidding",
            });
          } else {
            await auction.buy(WadFromRad(this.coinBalance));
            await auction.reload();
            this.log.info("Successfully placed bid in auction.", {
              method: "HandleBidding",
              auctionId: auction.id,
            });
          }
        }
      }
    } catch (error) {
      this.log.error("Error while handling bidding.", {
        error,
        method: "HandleBidding",
      });
      throw error;
    }
  }
}

export default Keeper;
