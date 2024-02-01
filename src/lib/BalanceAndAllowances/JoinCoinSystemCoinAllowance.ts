import { ethers } from "ethers";
import { Geb } from "@hai-on-op/sdk";

import { BalanceAndAllowanceBase } from "./Base";

export class JoinCoinSystemCoinAllowance extends BalanceAndAllowanceBase {
  geb: Geb;

  constructor(
    provider: ethers.providers.JsonRpcProvider,
    wallet: ethers.Wallet,
    intervalTime: number,
    geb: Geb
  ) {
    super(provider, wallet, intervalTime);
    this.geb = geb;
    this.initialize();
  }

  async getValue(): Promise<ethers.BigNumber> {
    const joinCoin = this.geb.contracts.joinCoin;
    const systemCoin = this.geb.contracts.systemCoin;
    return await systemCoin.allowance(this.wallet.address, joinCoin.address);
  }
}
