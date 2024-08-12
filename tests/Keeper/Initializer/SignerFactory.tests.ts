import {
  KeyPassSplitter,
  createWallet,
} from "../../../src/Keeper/Initializer/SignerFactory";
import path from "path";
import { ethers } from "ethers";
import { REQUIRED_ARGS_KEY_VALUE } from "../../contexts/args";

describe("SignerFactory", () => {
  describe("KeyPassSplitter", () => {
    it("Must throw error if can't find file and pass", () => {
      const walletPath1 = "";
      const walletPath2 = "key_file=asc.json";
      const walletPath3 = "pass_file=aaa.pass";

      expect(() => KeyPassSplitter(walletPath1)).toThrow(
        `Missing key_file path`
      );
      expect(() => KeyPassSplitter(walletPath3)).toThrow(
        `Missing key_file path`
      );
      expect(() => KeyPassSplitter(walletPath2)).toThrow(
        `Missing pass_file path`
      );
    });

    it("Must get proper file and pass file if both ", () => {
      const walletPath = "key_file=asc.json,pass_file=aaa.pass";
      const expectedKeyFile = "asc.json";
      const expectedPassFile = "aaa.pass";
      const keyFile = KeyPassSplitter(walletPath);

      expect(keyFile.key_file).toEqual(expectedKeyFile);
      expect(keyFile.pass_file).toEqual(expectedPassFile);
    });
  });

  describe("SignerFactory", () => {
    it("Must get proper wallet", () => {
      const walletPath = REQUIRED_ARGS_KEY_VALUE["--eth-key"];

      const keyFile = KeyPassSplitter(walletPath);

      const wallet = createWallet(keyFile);

      expect(wallet instanceof ethers.Wallet).toBe(true);

      expect(wallet.address.toLowerCase()).toEqual(
        `0x045808bd4cc3ef299be6b2850cdcd71e394e105c`.toLowerCase()
      );
    });
  });
});
