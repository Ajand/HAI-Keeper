import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";
import hre, { ethers } from "hardhat";
import { expect } from "chai";

import { mineBlocks, sleep, changeCollateralPrice } from "./utils";
import { mintHai } from "./fixtures";

import { REQUIRED_ARGS_KEY_VALUE } from "../tests/contexts/args";
import { keyValueArgsToList } from "../tests/helpers";

import Keeper from "../src/Keeper";

import { WadFromRad } from "../src/lib/Math";

const ALL_ARGS_KEY_VALUE = {
  ...REQUIRED_ARGS_KEY_VALUE,
};

describe("Auction House Tests", () => {
  it("Should load created auctions", async () => {
    const { provider, openSafeAndGenerateDebt, geb, fixtureWallet } =
      await loadFixture(mintHai);

    await mineBlocks(100);
    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER) + 100;

    const joinCoin = geb.contracts.joinCoin;
    const systemCoin = geb.contracts.systemCoin;
    const safeEngine = geb.contracts.safeEngine;

    const collateralAmount = ethers.utils.parseEther("5").toHexString();
    const haiAmount = ethers.utils.parseEther("7500").toHexString();
    const safeHaiAmount = ethers.utils.parseEther("1000").toHexString();

    const safe = await openSafeAndGenerateDebt(collateralAmount, safeHaiAmount);

    const keeperAddress = "0x045808bd4cc3ef299Be6b2850CDCD71e394e105C";

    await systemCoin.transfer(keeperAddress, safeHaiAmount);

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

    const safe1 = await openSafeAndGenerateDebt(collateralAmount, haiAmount);
    await sleep(2000);

    // After reducing the collateral price, the almost critical safes should be liquidated
    await changeCollateralPrice(150000000000, 105000000000, keeper.collateral)(
      hre,
      provider,
      fixtureWallet,
      geb
    );

    const auctionHouse = keeper.collateralAuctionHouse;

    await auctionHouse.reloadState();

    await sleep(5000);

    await auctionHouse.reloadState();
    expect(auctionHouse.auctions[0].id).to.be.equal(1);

    await sleep(500);

    const getCollateralBalance = async () =>
      await geb.contracts.safeEngine.tokenCollateral(
        keeper.collateral.tokenData.bytes32String,
        keeperAddress
      );

    const auctionData = await auctionHouse.contract.auctions(
      auctionHouse.auctions[0].id
    );

    await auctionHouse.auctions[0].buy(WadFromRad(keeper.coinBalance));

    expect(auctionData.amountToSell).to.be.equal(await getCollateralBalance());
  });
});
