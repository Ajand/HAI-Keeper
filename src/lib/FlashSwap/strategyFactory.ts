import { ethers } from "ethers";

import { MultiCollateralFlashSwapStrategy } from "./MultiCollateralFlashSwapStrategy";
import { MultiHopFlashSwapStrategy } from "./MultiHopFlashSwapStrategy";
import { FlashSwapStrategy } from "./types";

import { FlashSwapProxiesConfig } from "../../Keeper/configs/flashSwapProxyConfig";

// Define the flashSwapStrategyFactory function
export function flashSwapStrategyFactory(
  collateral: string,
  wallet: ethers.Wallet,
  proxyConfig: FlashSwapProxiesConfig | undefined
): FlashSwapStrategy | undefined {
  if (!proxyConfig) return undefined;
  const config = proxyConfig[collateral];
  if (!config) {
    return undefined;
  }

  if (config.type === "MultiCollateral" && config.payload) {
    return new MultiCollateralFlashSwapStrategy(
      config.address,
      wallet,
      config.payload[0],
      config.payload[1]
    );
  } else {
    return new MultiHopFlashSwapStrategy(config.address, wallet);
  }
}
