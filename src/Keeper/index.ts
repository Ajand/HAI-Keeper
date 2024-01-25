import { ArgsParser } from "./Initializer";
import { ethers, utils as ethersUtils } from "ethers";
import { Geb, utils } from "@hai-on-op/sdk";
import { KeyPassSplitter, createWallet } from "./Initializer/SignerFactory";
import { getPastSafeModifications } from "./EventHandlers";
import { NonceManager } from "@ethersproject/experimental";
import * as types from "@hai-on-op/sdk/lib/typechained";

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

export class Keeper {
  args;
  provider: ethers.providers.JsonRpcProvider;
  signer: ethers.Wallet;
  geb: Geb;
  collateral: Collateral;
  safeHistory: SafeHistory;

  collateralAuctionHouse: CollateralAuctionHouse;

  liquidatedSafes: Set<string> = new Set();

  startupFinished: boolean = false;

  coinBalance: ethers.BigNumber = ethers.BigNumber.from(0); // RAD
  collateralBalance: ethers.BigNumber = ethers.BigNumber.from(0); // WAD

  isBidding: boolean;
  keepSystemCoinInSafeEngine: boolean;
  keepCollateralInSafeEngine: boolean;

  constructor(argsList: string[], overrides: KeeperOverrides = {}) {
    this.args = ArgsParser(argsList);

    this.provider = overrides.provider
      ? overrides.provider
      : new ethers.providers.JsonRpcProvider(this.args["--rpc-uri"]);

    const keyFile = KeyPassSplitter(String(this.args["--eth-key"]));
    const wallet = createWallet(keyFile).connect(this.provider);

    console.info(`Keeper will interact as this address: ${wallet.address}`);

    this.signer = wallet.connect(this.provider);

    const testingNetwork = "optimism-goerli";
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

    this.safeHistory = new SafeHistory(
      { provider: this.provider, geb: this.geb },
      this.collateral,
      Number(this.args["--from-block"])
    );

    this.collateralAuctionHouse = new CollateralAuctionHouse(
      {
        provider: this.provider,
        geb: this.geb,
      },
      this.collateral
    );

    // Setting up the keeper setup props
    this.isBidding = this.args["--start-auctions-only"] ? false : true;
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

    this.handleLifeCycle();
  }

  async handleLifeCycle() {
    // startup logic

    await this.startup();

    // on each block logic
    let processedBlock: number;
    let isProcessing = false;
    this.provider.on("block", async () => {
      if (this.startupFinished) {
        const currentBlockNumber = await this.provider.getBlockNumber();
        if (processedBlock !== currentBlockNumber && !isProcessing) {
          isProcessing = true;
          try {
            this.checkSafes();
            if (this.collateralAuctionHouse.loaded) {
              await this.collateralAuctionHouse.reloadState();
            }
          } catch (err) {
            console.error(err);
          }

          processedBlock = await this.provider.getBlockNumber();
          isProcessing = false;

          this.handleBidding();
        }
      }
    });
  }

  async startup() {
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
      console.info("Approving system coin to be used by coin join.");
      const tx = await systemCoin.approve(
        joinCoin.address,
        ethers.constants.MaxUint256
      );
      await tx.wait();
      console.info("Approved keeper's system coins to be used by coin join.");
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

    const tx = await joinCoin.join(this.signer.address, keeperBalance);
    await tx.wait();
    console.info(`Joined ${keeperBalance} system coin.`);
  }

  async exitCollateral() {
    console.info("Exiting the collateral from the coin join.");
    const collateralJoin = types.ICollateralJoin__factory.connect(
      this.collateral.tokenData.collateralJoin,
      this.signer
    );
    await this.getCollateralBalance();
    await collateralJoin.exit(this.signer.address, this.collateralBalance);
    console.info(
      `Exited ${this.collateralBalance} collaterals from the collateral join.`
    );
    await this.getCollateralBalance();
  }

  async exitSystemCoin() {
    console.info("Exiting the system coins from the coin join.");
    const joinCoin = this.geb.contracts.joinCoin;
    await this.handleSafeApprovalForExit();
    await this.getSystemCoinBalance();
    const tx = await joinCoin.exit(
      this.signer.address,
      WadFromRad(this.coinBalance)
    );
    await tx.wait();
    console.info(
      `Exited ${this.collateralBalance} system coin from the coin join.`
    );
    await this.getSystemCoinBalance();
  }

  async handleSafeApprovalForExit() {
    const joinCoin = this.geb.contracts.joinCoin;

    const isCollateralApprovedForAddress =
      await this.geb.contracts.safeEngine.safeRights(
        String(this.signer.address),
        joinCoin.address
      );

    if (!isCollateralApprovedForAddress) {
      console.info(
        "Approving keeper's address to be able exit system by coin join."
      );
      const tx = await this.geb.contracts.safeEngine.approveSAFEModification(
        joinCoin.address
      );
      await tx.wait();
      console.info("Keeper's address approved to be used by coin join.");
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
    if (this.collateral.initialized) {
      await this.collateral.updateInfo();
    } else {
      await this.collateral.init();
    }

    const safes = await this.safeHistory.getSafes();

    const safesArray = [...safes].map((safe) => safe[1]);

    for (const safe of safesArray) {
      if (safe.canLiquidate()) {
        console.info("can liquidate safe: ", safe.address);
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
    if (this.isBidding) {
      await this.collateralAuctionHouse.handleAuctionsState();

      const auctions = this.collateralAuctionHouse.auctions;

      for (const auction of auctions) {
        if (!auction.deleted) {
          // This random sleep helps in nonce manager
          await sleep(Math.floor(Math.random() * 1000 * 2));
          await this.getSystemCoinBalance();
          await auction.buy(WadFromRad(this.coinBalance));
          await auction.reload();
        }
      }
    }
  }
}

export default Keeper;
