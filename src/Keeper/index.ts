import { ArgsParser } from "./Initializer";

class Keeper {
  args;

  constructor(argsList: string[]) {
    this.args = ArgsParser(argsList);
  }
}
