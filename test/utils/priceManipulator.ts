import { ChainlinkPriceFeedConfig } from "../ChainLinkManipulator";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";

import { Collateral } from "../../src/lib";
import { gebUtils } from "./geb";

export const initializeChainlinkPriceFeed = async (
  hre: HardhatRuntimeEnvironment,
  provider: ethers.providers.Provider
) => {
  const chainLinkPriceFeed = new ChainlinkPriceFeedConfig(hre, provider);
  await chainLinkPriceFeed.initChainlinkPriceFeedConfig("ETH/USD");
  return chainLinkPriceFeed;
};

export const changeCollateralPrice =
  (price1: number, price2: number, collateral: Collateral) =>
  async (
    hre: HardhatRuntimeEnvironment,
    provider: ethers.providers.Provider,
    wallet: ethers.Wallet,
    geb: Geb
  ) => {
    const chainLinkPriceFeed = await initializeChainlinkPriceFeed(
      hre,
      provider
    );

    const collateralByteString = collateral.tokenData.bytes32String;
    const { getWethOracle } = gebUtils(wallet);
    const delayedWethOracle = await getWethOracle();
    await chainLinkPriceFeed.setPrice("ETH/USD", price1);
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
    await chainLinkPriceFeed.setPrice("ETH/USD", price2);
    await increaseTime(2000);
    await delayedWethOracle.updateResult();
    await geb.contracts.oracleRelayer.updateCollateralPrice(
      collateralByteString
    );
    await collateral.updateInfo();
  };
