import { ethers } from "ethers";
import { merge, interval, BehaviorSubject, Subject } from "rxjs";
import { startWith, switchMap } from "rxjs/operators";

export abstract class BalanceAndAllowanceBase {
  provider: ethers.providers.JsonRpcProvider;
  wallet: ethers.Wallet;
  intervalTime: number;

  value$: BehaviorSubject<ethers.BigNumber | null>;
  updateTrigger$: Subject<void>;

  constructor(
    provider: ethers.providers.JsonRpcProvider,
    wallet: ethers.Wallet,
    intervalTime: number
  ) {
    this.provider = provider;
    this.wallet = wallet;
    this.intervalTime = intervalTime;

    this.value$ = new BehaviorSubject<ethers.BigNumber | null>(null);
    this.updateTrigger$ = new Subject<void>();
  }

  initialize() {
    merge(interval(this.intervalTime), this.updateTrigger$)
      .pipe(
        startWith(null),
        switchMap(() => this.getValue())
      )
      .subscribe((balance) => {
        this.value$.next(balance);
      });
  }

  abstract getValue(): Promise<ethers.BigNumber>;

  updateBalance() {
    this.updateTrigger$.next();
  }
}
