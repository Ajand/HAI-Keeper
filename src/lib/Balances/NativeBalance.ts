import { ethers } from "ethers";
import { merge, interval, BehaviorSubject, Subject } from "rxjs";
import { startWith, switchMap } from "rxjs/operators";

import { Logger } from "pino";
import logger from "../logger";

export class NativeBalance {
  provider: ethers.providers.JsonRpcProvider;
  wallet: ethers.Wallet;

  value$: BehaviorSubject<ethers.BigNumber | null>;
  updateTrigger$: Subject<void>;

  log: Logger;

  constructor(
    provider: ethers.providers.JsonRpcProvider,
    wallet: ethers.Wallet,
    intervalTime: number
  ) {
    this.provider = provider;
    this.wallet = wallet;

    this.value$ = new BehaviorSubject<ethers.BigNumber | null>(null);
    this.updateTrigger$ = new Subject<void>();

    //Create a child logger for this module
    this.log = logger.child({
      module: "NativeBalance",
      walletAddress: this.wallet.address,
    });

    // Use switchMap to switch to the latest observable whenever updateTrigger$ emits
    merge(interval(intervalTime), this.updateTrigger$)
      .pipe(
        startWith(null),
        switchMap(() => this.getBalance())
      )
      .subscribe((balance) => {
        this.value$.next(balance);
      });

    // Log debug message for initialization
    this.log.debug("Native balance module initialized");
  }

  async getBalance(): Promise<ethers.BigNumber> {
    try {
      this.log.debug("Fetching balance from provider...");
      const balance = await this.provider.getBalance(this.wallet.address);
      this.log.debug("Balance fetched successfully:", balance.toString());
      return balance;
    } catch (error) {
      this.log.error("Error fetching balance:", error);
      throw error;
    }
  }

  updateBalance() {
    this.log.debug("Triggering balance update...");
    this.updateTrigger$.next();
  }
}
