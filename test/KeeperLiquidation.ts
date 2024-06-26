import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";
import { ethers } from "ethers";
import hre from "hardhat";
import { expect } from "chai";

import { mineBlocks, sleep, changeCollateralPrice } from "./utils";
import { mintHai } from "./fixtures";

import { REQUIRED_ARGS_KEY_VALUE } from "../tests/contexts/args";
import { keyValueArgsToList } from "../tests/helpers";

import Keeper from "../src/Keeper";

const ALL_ARGS_KEY_VALUE = {
  ...REQUIRED_ARGS_KEY_VALUE,
};

/*

const desiredError= "0x660f68af"

    Object.entries(geb.contracts).forEach((contract) => {
      try {
        const parsedError = contract[1].interface.parseError(desiredError);
        console.log("parsed error is: ", parsedError);
      } catch (err) {
        console.log(`can't find the error in ${contract[0]}`);
      }
    });

*/

describe("Keeper Liquidation", () => {
  beforeEach(async function () {});

  it("Should liquidate liquidatable safes", async () => {
    const { provider, openSafeAndGenerateDebt, geb, fixtureWallet } =
      await mintHai();

    await mineBlocks(100);
    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER) + 100;

    const keeper = new Keeper(
      keyValueArgsToList({
        ...ALL_ARGS_KEY_VALUE,
        "--from-block": startingBlock.toString(),
      }),
      {
        provider: provider,
      }
    );

    const desiredError = "0x660f68af";

    Object.entries(geb.contracts).forEach((contract) => {
      try {
        const parsedError = contract[1].interface.parseError(desiredError);
        console.log("parsed error is: ", parsedError);
      } catch (err) {
        console.log(`can't find the error in ${contract[0]}`);
      }
    });

    await provider.send("hardhat_setBalance", [
      keeper.signer.address,
      ethers.utils.parseEther("1000000").toHexString(),
    ]);

    const collateralAmount = ethers.utils.parseEther("5").toHexString();
    const haiAmount = ethers.utils.parseEther("7400").toHexString();
    const safeHaiAmount = ethers.utils.parseEther("1000").toHexString();

    await sleep(2000);

    const safe1 = await openSafeAndGenerateDebt(collateralAmount, haiAmount);
    await sleep(2000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);

    await mineBlocks(2);
    await sleep(2000);

    const safe2 = await openSafeAndGenerateDebt(
      collateralAmount,
      safeHaiAmount
    );
    await sleep(2000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);

    await mineBlocks(2);
    await sleep(2000);

    const safe3 = await openSafeAndGenerateDebt(collateralAmount, haiAmount);
    await sleep(2000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);

    await mineBlocks(2);
    await sleep(2000);

    // After reducing the collateral price, the almost critical safes should be liquidated
    await changeCollateralPrice(
      "1500000000000000000000",
      "1000000000000000000000",
      keeper.collateral
    )(hre, provider, fixtureWallet, geb);

    await sleep(5000);

    expect(keeper.liquidatedSafes.size).to.be.equal(2);
    expect(keeper.liquidatedSafes.has(String(safe1))).to.be.true;
    expect(keeper.liquidatedSafes.has(String(safe2))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe3))).to.be.true;

    const safe4 = await openSafeAndGenerateDebt(
      collateralAmount,
      safeHaiAmount
    );

    await sleep(2000);
    await mineBlocks(2);

    expect(keeper.liquidatedSafes.size).to.be.equal(2);
    expect(keeper.liquidatedSafes.has(String(safe1))).to.be.true;
    expect(keeper.liquidatedSafes.has(String(safe2))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe3))).to.be.true;
    expect(keeper.liquidatedSafes.has(String(safe4))).to.be.false;
  });

  it("Should not liquidate safes in bid only mode", async () => {
    const { provider, openSafeAndGenerateDebt, geb, fixtureWallet } =
      await mintHai();

    await mineBlocks(100);
    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER) + 100;

    const keeper = new Keeper(
      keyValueArgsToList({
        ...ALL_ARGS_KEY_VALUE,
        "--from-block": startingBlock.toString(),
        "--bid-only": true,
      }),
      {
        provider: provider,
      }
    );

    await provider.send("hardhat_setBalance", [
      keeper.signer.address,
      ethers.utils.parseEther("1000000").toHexString(),
    ]);

    const collateralAmount = ethers.utils.parseEther("5").toHexString();
    const haiAmount = ethers.utils.parseEther("7400").toHexString();
    const safeHaiAmount = ethers.utils.parseEther("1000").toHexString();

    await sleep(2000);

    const safe1 = await openSafeAndGenerateDebt(collateralAmount, haiAmount);
    await sleep(2000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);

    await mineBlocks(2);
    await sleep(2000);

    const safe2 = await openSafeAndGenerateDebt(
      collateralAmount,
      safeHaiAmount
    );
    await sleep(2000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);

    await mineBlocks(2);
    await sleep(2000);

    const safe3 = await openSafeAndGenerateDebt(collateralAmount, haiAmount);
    await sleep(2000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);

    await mineBlocks(2);
    await sleep(2000);

    // After reducing the collateral price, the almost critical safes should be liquidated
    await changeCollateralPrice(
      "1500000000000000000000",
      "1000000000000000000000",
      keeper.collateral
    )(hre, provider, fixtureWallet, geb);

    await sleep(5000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);
    expect(keeper.liquidatedSafes.has(String(safe1))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe2))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe3))).to.be.false;

    const safe4 = await openSafeAndGenerateDebt(
      collateralAmount,
      safeHaiAmount
    );

    await sleep(2000);
    await mineBlocks(2);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);
    expect(keeper.liquidatedSafes.has(String(safe1))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe2))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe3))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe4))).to.be.false;
  });
});
