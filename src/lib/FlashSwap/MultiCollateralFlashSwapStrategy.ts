import { ethers } from "ethers";
import { FlashSwapStrategy } from "./types";

import HaiUniswapV3MultiCollateralKeeperFlashProxy from "./abis/HaiUniswapV3MultiCollateralKeeperFlashProxy.json";

// Define the MultiCollateralFlashSwapStrategy class
export class MultiCollateralFlashSwapStrategy implements FlashSwapStrategy {
  contract: ethers.Contract;
  collateralJoin: string;
  pool: string;

  constructor(
    proxyAddress: string,
    wallet: ethers.Wallet,
    pool: string,
    collateralJoin: string
  ) {
    // Initialize the contract with the proxy address and ABI

    this.contract = new ethers.Contract(
      proxyAddress,
      HaiUniswapV3MultiCollateralKeeperFlashProxy,
      wallet
    );

    this.pool = pool;
    this.collateralJoin = collateralJoin;
  }

  async liquidateAndSettleSafe(safe: string): Promise<void> {
    // need collateral join
    // uniswap pool address

    // Implement the liquidation and settlement logic using the contract
    const tx = await this.contract.liquidateAndSettleSAFE(
      this.collateralJoin,
      safe,
      this.pool
    );

    const receipt = await tx.wait();

    return receipt;
  }
}
