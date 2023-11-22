import Keeper from "../../src/Keeper";

import { REQUIRED_ARGS_KEY_VALUE } from "../contexts/args";
import { keyValueArgsToList } from "../helpers";

describe("Keeper", () => {
  describe("Keeper Initialization", () => {
    const keeper = new Keeper(keyValueArgsToList(REQUIRED_ARGS_KEY_VALUE));

    console.log(keeper);

    test("Must have a proper provider and could get blocknumber from it", async () => {
      const blockNumber = await keeper.provider.getBlockNumber();
      expect(blockNumber).not.toBeNaN;
    });
  });
});
