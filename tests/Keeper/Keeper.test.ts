import Keeper from "../../src/Keeper";

import { REQUIRED_ARGS_KEY_VALUE } from "../contexts/args";
import { keyValueArgsToList } from "../helpers";

describe("Keeper", () => {
  describe("Keeper Initialization", () => {
    const keeper = new Keeper(keyValueArgsToList(REQUIRED_ARGS_KEY_VALUE));

    test("Must have a proper provider and could get blocknumber from it", async () => {
      const blockNumber = await keeper.provider.getBlockNumber();
      expect(blockNumber).not.toBeNaN;
    });

    test("Must have the proper signer", async () => {
      const signerAddress = await keeper.signer.getAddress();
      expect(signerAddress.toLowerCase()).toBe(
        "0x045808bd4cc3ef299be6b2850cdcd71e394e105c".toLowerCase()
      );
    });
  });
});
