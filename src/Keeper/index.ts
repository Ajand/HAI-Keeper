import { ArgsParser } from "./Initializer";
import { ethers } from "ethers";
import { KeyPassSplitter, createWallet } from "./Initializer/SignerFactory";

export class Keeper {
  args;
  provider: ethers.providers.JsonRpcProvider;
  signer: ethers.Signer;

  constructor(argsList: string[]) {
    this.args = ArgsParser(argsList);
    this.provider = new ethers.providers.JsonRpcProvider(
      this.args["--rpc-uri"]
    );

    const keyFile = KeyPassSplitter(String(this.args["--eth-key"]));
    const wallet = createWallet(keyFile).connect(this.provider);

    this.signer = wallet;
  }
}

export default Keeper;
