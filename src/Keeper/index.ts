import { ArgsParser } from "./Initializer";
import { ethers, utils as ethersUtils } from "ethers";
import { Geb, utils } from "@hai-on-op/sdk";
import { KeyPassSplitter, createWallet } from "./Initializer/SignerFactory";

interface KeeperOverrides {
  provider?: ethers.providers.JsonRpcProvider;
  signer?: ethers.Signer;
}

export class Keeper {
  args;
  provider: ethers.providers.JsonRpcProvider;
  signer: ethers.Signer;
  geb: Geb;

  constructor(argsList: string[], overrides: KeeperOverrides = {}) {
    this.args = ArgsParser(argsList);
    this.provider = overrides.provider
      ? overrides.provider
      : new ethers.providers.JsonRpcProvider(this.args["--rpc-uri"]);

    const keyFile = KeyPassSplitter(String(this.args["--eth-key"]));
    const wallet = createWallet(keyFile).connect(this.provider);

    this.signer = wallet;

    this.geb = new Geb("optimism-goerli", this.provider);
  }
}

export default Keeper;
