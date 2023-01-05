import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";
import hre, { ethers } from "hardhat";
import { expect } from "chai";

import { mineBlocks, sleep, changeCollateralPrice } from "./utils";
import { mintHai } from "./fixtures";

import { REQUIRED_ARGS_KEY_VALUE } from "../tests/contexts/args";
import { keyValueArgsToList } from "../tests/helpers";

import Keeper from "../src/Keeper";

const ALL_ARGS_KEY_VALUE = {
  ...REQUIRED_ARGS_KEY_VALUE,
};

describe("Keeper startup logic", () => {
  /*it("Should have approvals for the coin join after startup", async () => {
    const { provider, openSafeAndGenerateDebt, geb, fixtureWallet } =
      await loadFixture(mintHai);

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

    await provider.send("hardhat_setBalance", [
      keeper.signer.address,
      ethers.utils.parseEther("1000000").toHexString(),
    ]);

    await sleep(2000);

    const joinCoin = geb.contracts.joinCoin;
    const systemCoin = geb.contracts.systemCoin;

    expect(
      await systemCoin.allowance(keeper.signer.address, joinCoin.address)
    ).to.be.equal(ethers.constants.MaxUint256);
  });*/

  it("Should join to the coin join after startup", async () => {
    const { provider, openSafeAndGenerateDebt, geb, fixtureWallet } =
      await loadFixture(mintHai);

    await mineBlocks(100);
    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER) + 100;

    const joinCoin = geb.contracts.joinCoin;
    const systemCoin = geb.contracts.systemCoin;
    const safeEngine = geb.contracts.safeEngine;

    const collateralAmount = ethers.utils.parseEther("5").toHexString();
    const haiAmount = ethers.utils.parseEther("7500").toHexString();

    const safe1 = await openSafeAndGenerateDebt(collateralAmount, haiAmount);

    const keeperAddress = "0x045808bd4cc3ef299Be6b2850CDCD71e394e105C";

    expect(await systemCoin.balanceOf(keeperAddress)).to.be.equal(0);

    const fixtureWalletHaiBalance = await systemCoin.balanceOf(
      fixtureWallet.address
    );

    await systemCoin.transfer(keeperAddress, fixtureWalletHaiBalance);

    expect(await systemCoin.balanceOf(keeperAddress)).to.be.equal(
      fixtureWalletHaiBalance
    );

    await provider.send("hardhat_setBalance", [
      keeperAddress,
      ethers.utils.parseEther("1000000").toHexString(),
    ]);

    const keeper = new Keeper(
      keyValueArgsToList({
        ...ALL_ARGS_KEY_VALUE,
        "--from-block": startingBlock.toString(),
      }),
      {
        provider: provider,
      }
    );

    await sleep(2000);

    expect(await systemCoin.balanceOf(keeper.signer.address)).to.be.equal(0);
    expect(await safeEngine.coinBalance(keeper.signer.address)).to.be.equal(
      fixtureWalletHaiBalance
    );
  });
});
