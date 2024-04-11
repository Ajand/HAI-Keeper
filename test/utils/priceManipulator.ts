import { ChainlinkPriceFeedConfig } from "../ChainLinkManipulator";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";

import { Collateral } from "../../src/lib";
import { gebUtils } from "./geb";

function bytes32ToNumberString(bytes32String) {
  // Remove '0x' prefix if it exists
  if (bytes32String.startsWith("0x")) {
    bytes32String = bytes32String.slice(2);
  }

  // Convert hexadecimal string to BigInt
  let value = BigInt("0x" + bytes32String);

  // Convert BigInt to string
  return value.toString();
}

function numberStringToBytes32(numberString) {
  // Convert string to BigInt
  let value = BigInt(numberString);

  // Convert BigInt to hexadecimal string
  let hexString = value.toString(16).padStart(64, "0");

  // Add '0x' prefix
  return "0x" + hexString;
}

export const initializeChainlinkPriceFeed = async (
  hre: HardhatRuntimeEnvironment,
  provider: ethers.providers.Provider
) => {
  const chainLinkPriceFeed = new ChainlinkPriceFeedConfig(hre, provider);
  await chainLinkPriceFeed.initChainlinkPriceFeedConfig("ETH/USD");
  return chainLinkPriceFeed;
};

export const changeCollateralPrice =
  (price1: string, price2: string, collateral: Collateral) =>
  async (
    hre: HardhatRuntimeEnvironment,
    provider: ethers.providers.Provider,
    wallet: ethers.Wallet,
    geb: Geb
  ) => {
    //const chainLinkPriceFeed = await initializeChainlinkPriceFeed(
    //  hre,
    //  provider
    //);

    const collateralByteString = collateral.tokenData.bytes32String;
    const { getWethOracle } = gebUtils(wallet);
    const delayedWethOracle = await getWethOracle();

    const targetOracle = "0x69e006b1D931071F6047eceE7Fd997086769Dfc9";

    const currentPrice = await provider.getStorageAt(targetOracle, "0x0");

    // @ts-ignore
    await provider.send("hardhat_setStorageAt", [
      targetOracle,
      "0x0",
      numberStringToBytes32(price1),
    ]);

    const newPrice = await provider.getStorageAt(targetOracle, "0x0");

    //await chainLinkPriceFeed.setPrice("ETH/USD", price1);
    const increaseTime = async (amount: number) => {
      //@ts-ignore
      await provider.send("evm_increaseTime", [amount]);
      //@ts-ignore
      await provider.send("evm_mine", []);
    };

    await increaseTime(1800);
    await delayedWethOracle.updateResult();
    await increaseTime(1800);
    await geb.contracts.oracleRelayer.updateCollateralPrice(
      collateralByteString
    );

    // @ts-ignore
    await provider.send("hardhat_setStorageAt", [
      targetOracle,
      "0x0",
      numberStringToBytes32(price2),
    ]);

    //await chainLinkPriceFeed.setPrice("ETH/USD", price2);
    await increaseTime(2000);
    await delayedWethOracle.updateResult();
    await geb.contracts.oracleRelayer.updateCollateralPrice(
      collateralByteString
    );
    await collateral.updateInfo();
  };
