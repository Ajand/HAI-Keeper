import { ArgsParser } from "./Initializer";
import { ethers } from "ethers";

export class Keeper {
  args;
  provider: ethers.providers.JsonRpcProvider;

  constructor(argsList: string[]) {
    this.args = ArgsParser(argsList);
    this.provider = new ethers.providers.JsonRpcProvider(
      this.args["--rpc-uri"]
    );
  }
}

export default Keeper;
