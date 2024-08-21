import { ethers } from "ethers";
import { TokenData } from "@hai-on-op/sdk";

export interface ILogger {
  debug(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
}

export interface CollateralParams {
  debtCeiling: ethers.BigNumber;
  debtFloor: ethers.BigNumber;
}

export interface CollateralData {
  debtAmount: ethers.BigNumber;
  lockedAmount: ethers.BigNumber;
  accumulatedRate: ethers.BigNumber;
  safetyPrice: ethers.BigNumber;
  liquidationPrice: ethers.BigNumber;
}

export interface Collateral {
  tokenData: TokenData;
  initialized: boolean;
  init(): Promise<void>;
  updateInfo(): Promise<void>;
  getNormalizedInfo(): Record<string, string>;
  getParams(): CollateralParams;
  getData(): CollateralData;
}

export interface SafeInfo {
  lockedCollateral: ethers.BigNumber;
  generatedDebt: ethers.BigNumber;
}

export interface ISafeProvider {
  getSafeInfo(safeAddress: string, collateralType: string): Promise<SafeInfo>;
  liquidateSafe(
    safeAddress: string,
    collateralType: string
  ): Promise<ethers.ContractReceipt>;
}

export interface FlashSwapStrategy {
  liquidateAndSettleSafe(safeAddress: string): Promise<void>;
}

export interface ISafe {
  readonly address: string;
  readonly collateral: Collateral;
  readonly flashSwapStrategy?: FlashSwapStrategy;

  init(): Promise<void>;
  updateInfo(): Promise<void>;
  isCritical(): boolean;
  canLiquidate(): boolean;
  liquidate(): Promise<void>;
}
