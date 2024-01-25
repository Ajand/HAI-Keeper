import { ethers } from "ethers";
import { merge, interval, BehaviorSubject, Subject } from "rxjs";
import { startWith, switchMap } from "rxjs/operators";

export class NativeBalance {
  provider: ethers.providers.JsonRpcProvider;
  wallet: ethers.Wallet;

  value$: BehaviorSubject<ethers.BigNumber | null>;
  updateTrigger$: Subject<void>;

  constructor(
    provider: ethers.providers.JsonRpcProvider,
    wallet: ethers.Wallet,
    intervalTime: number
  ) {
    this.provider = provider;
    this.wallet = wallet;

    this.value$ = new BehaviorSubject<ethers.BigNumber | null>(null);
    this.updateTrigger$ = new Subject<void>();

    // Use switchMap to switch to the latest observable whenever updateTrigger$ emits
    merge(interval(intervalTime), this.updateTrigger$)
      .pipe(
        startWith(null),
        switchMap(() => this.getBalance())
      )
      .subscribe((balance) => {
        this.value$.next(balance);
      });
  }

  async getBalance(): Promise<ethers.BigNumber> {
    const balance = await this.provider.getBalance(this.wallet.address);
    return balance;
  }

  updateBalance() {
    this.updateTrigger$.next();
  }
}
