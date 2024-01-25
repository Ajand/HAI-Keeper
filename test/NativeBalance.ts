import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";
import hre from "hardhat";
import { ethers } from "ethers";
import { expect } from "chai";

import { mineBlocks, sleep, changeCollateralPrice } from "./utils";
import { mintHai } from "./fixtures";

import { REQUIRED_ARGS_KEY_VALUE } from "../tests/contexts/args";
import { keyValueArgsToList } from "../tests/helpers";

import { RadFromWad } from "../src/lib/Math";

import {
  createWallet,
  KeyPassSplitter,
} from "../src/Keeper/Initializer/SignerFactory";

import { NativeBalance } from "../src/lib";

const ALL_ARGS_KEY_VALUE = {
  ...REQUIRED_ARGS_KEY_VALUE,
};

function removeLeadingZero(hexString: string): string {
  // Check if the string starts with "0x" and has more than two characters
  if (hexString.startsWith("0x") && hexString.length > 2) {
    // Remove the leading "0" after "x"
    return "0x" + hexString.slice(2).replace(/^0+/, "");
  }

  // If the input is not in the expected format, return it unchanged
  return hexString;
}

describe("Native Balance", () => {
  it("Native", async () => {
    const { provider, openSafeAndGenerateDebt, geb, fixtureWallet } =
      await loadFixture(mintHai);

    await mineBlocks(100);
    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER) + 100;

    const args = keyValueArgsToList({
      ...ALL_ARGS_KEY_VALUE,
      "--from-block": startingBlock.toString(),
    });

    console.log(ALL_ARGS_KEY_VALUE["--eth-key"]);

    const keyFile = KeyPassSplitter(String(ALL_ARGS_KEY_VALUE["--eth-key"]));

    const wallet = createWallet(keyFile).connect(provider);

    const nativeBalance = new NativeBalance(provider, wallet, 1000);

    nativeBalance.value$.subscribe((balance) => {
      console.log("Native balance is: ", balance);
    });

    await provider.send("hardhat_setBalance", [
      wallet.address,
      removeLeadingZero(ethers.utils.parseEther("1000000").toHexString()),
    ]);
    await sleep(1000);

    await provider.send("hardhat_setBalance", [
      wallet.address,
      removeLeadingZero(ethers.utils.parseEther("2000000").toHexString()),
    ]);
    await sleep(1000);

    await provider.send("hardhat_setBalance", [
      wallet.address,
      removeLeadingZero(ethers.utils.parseEther("3000000").toHexString()),
    ]);
    await sleep(1000);

    await provider.send("hardhat_setBalance", [
      wallet.address,
      removeLeadingZero(ethers.utils.parseEther("4000000").toHexString()),
    ]);
    await sleep(1000);

    await provider.send("hardhat_setBalance", [
      wallet.address,
      removeLeadingZero(ethers.utils.parseEther("5000000").toHexString()),
    ]);
    await sleep(1000);

    await provider.send("hardhat_setBalance", [
      wallet.address,
      removeLeadingZero(ethers.utils.parseEther("6000000").toHexString()),
    ]);

    await sleep(2000);
  });
});

// import { atom, WritableAtom } from "@hungry-egg/rx-state";

//   value$: WritableAtom<undefined | ethers.BigNumber>;

//this.value$ = atom(undefined);

//this.value$.set(balance);
