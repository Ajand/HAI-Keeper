import { ethers } from "ethers";
import { TokenData } from "@hai-on-op/sdk";

export interface ICollateralFetcher {
  fetchParams(tokenBytes32: string): Promise<CollateralParams>;
  fetchData(tokenBytes32: string): Promise<CollateralData>;
}

export interface ILogger {
  debug(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

export interface CollateralParams {
  debtCeiling: ethers.BigNumber; // RAD
  debtFloor: ethers.BigNumber; // RAD
}

export interface CollateralData {
  debtAmount: ethers.BigNumber; // WAD
  lockedAmount: ethers.BigNumber; // WAD
  accumulatedRate: ethers.BigNumber; // RAY
  safetyPrice: ethers.BigNumber; // RAY
  liquidationPrice: ethers.BigNumber; // RAY
}

export interface ICollateral {
  readonly tokenData: TokenData;
  initialized: boolean;

  init(): Promise<void>;
  updateInfo(): Promise<void>;
  getNormalizedInfo(): Record<string, string>;
  getParams(): CollateralParams;
  getData(): CollateralData;
}
