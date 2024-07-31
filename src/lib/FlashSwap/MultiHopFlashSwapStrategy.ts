import { ethers } from "ethers";
import { FlashSwapStrategy } from "./types";

import HaiUniswapV3MultiHopCollateralKeeperFlashProxy from "./abis/HaiUniswapV3MultiHopCollateralKeeperFlashProxy.json";

export class MultiHopFlashSwapStrategy implements FlashSwapStrategy {
  contract: ethers.Contract;

  constructor(proxyAddress: string, wallet: ethers.Wallet) {
    // Initialize the contract with the proxy address and ABI
    this.contract = new ethers.Contract(
      proxyAddress,
      HaiUniswapV3MultiHopCollateralKeeperFlashProxy,
      wallet
    );
  }

  async liquidateAndSettleSafe(safe: string): Promise<void> {
    const tx = await this.contract["liquidateAndSettleSAFE(address)"](safe);

    const receipt = await tx.wait();

    return receipt;
  }
}
