import { ethers } from "ethers";

import { BalanceAndAllowanceBase } from "./Base";

export class NativeBalance extends BalanceAndAllowanceBase {
  constructor(
    provider: ethers.providers.JsonRpcProvider,
    wallet: ethers.Wallet,
    intervalTime: number
  ) {
    super(provider, wallet, intervalTime);
    this.initialize();
  }

  async getValue(): Promise<ethers.BigNumber> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return balance;
  }
}
