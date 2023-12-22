import { ArgsParser } from "./Initializer";
import { ethers, utils as ethersUtils } from "ethers";
import { Geb, utils } from "@hai-on-op/sdk";
import { KeyPassSplitter, createWallet } from "./Initializer/SignerFactory";
import { getPastSafeModifications } from "./EventHandlers";

import { Collateral, SafeHistory } from "../lib";

interface KeeperOverrides {
  provider?: ethers.providers.JsonRpcProvider;
  signer?: ethers.Signer;
}

export class Keeper {
  args;
  provider: ethers.providers.JsonRpcProvider;
  signer: ethers.Wallet;
  geb: Geb;
  collateral: Collateral;
  safeHistory: SafeHistory;

  liquidatedSafes: Set<string> = new Set();

  constructor(argsList: string[], overrides: KeeperOverrides = {}) {
    this.args = ArgsParser(argsList);

    this.provider = overrides.provider
      ? overrides.provider
      : new ethers.providers.JsonRpcProvider(this.args["--rpc-uri"]);

    const keyFile = KeyPassSplitter(String(this.args["--eth-key"]));
    const wallet = createWallet(keyFile).connect(this.provider);

    this.signer = wallet.connect(this.provider);

    this.geb = new Geb("optimism-goerli", this.signer);

    if (!this.args["--collateral"]) {
      this.collateral = new Collateral(
        { provider: this.provider, geb: this.geb },
        this.geb.tokenList.WETH
      );
      this.collateral.init();
    } else {
      this.collateral = new Collateral(
        { provider: this.provider, geb: this.geb },
        this.geb.tokenList[this.args["--collateral"]]
      );
      this.collateral.init();
    }

    console.log(Number(this.args["--from-block"]));

    this.safeHistory = new SafeHistory(
      { provider: this.provider, geb: this.geb },
      this.collateral,
      Number(this.args["--from-block"])
    );

    this.handleLifeCycle();
  }

  handleLifeCycle() {
    let processedBlock: number;
    let isProcessing = false;
    this.provider.on("block", async () => {
      const currentBlockNumber = await this.provider.getBlockNumber();
      if (processedBlock !== currentBlockNumber && !isProcessing) {
        isProcessing = true;
        try {
          this.checkSafes(currentBlockNumber);
        } catch (err) {
          console.error(err);
        }

        processedBlock = await this.provider.getBlockNumber();
        isProcessing = false;
      }
    });
  }

  async checkSafes(currentBlockNumber: number) {
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

  async getSafes() {
    const startingBlock = 17538859;
    const endBlock = (await this.provider.getBlock("latest")).number;

    return getPastSafeModifications({
      geb: this.geb,
      provider: this.provider,
    })(startingBlock, endBlock, "");
  }
}

export default Keeper;
