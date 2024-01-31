import {
  from,
  Subject,
  concatMap,
  BehaviorSubject,
  retry,
  defer,
  map,
} from "rxjs";

export type Task = (...args: any[]) => Promise<any>;

export enum QueStatus {
  IDLE,
  WORKING,
  FAILED,
}

export interface Transaction {
  label: string;
  task: Task;
}

export class TransactionQueue {
  tasksSubject$: Subject<Transaction>;
  status$: BehaviorSubject<QueStatus>;

  constructor(retryCount: number) {
    console.info("Transaction Queue initiated");
    this.tasksSubject$ = new Subject<Transaction>();
    this.status$ = new BehaviorSubject<QueStatus>(QueStatus.IDLE);

    this.tasksSubject$
      .pipe(
        concatMap((transaction) => {
          this.status$.next(QueStatus.WORKING);

          return defer(() => from(transaction.task())).pipe(
            retry({ count: retryCount, delay: 500 }),
            map(() => transaction.label)
          );
        })
      )
      .subscribe({
        next: (label) => {
          this.status$.next(QueStatus.IDLE);
        },
        error: (err: any) => {
          console.error(
            `${err.label} Transaction failed after ${retryCount} retries.\n`,
            err
          );
          this.status$.next(QueStatus.FAILED);
        },
      });

    this.status$.subscribe((v) => {
      console.info(`||| Transaction Queue Status: ${QueStatus[v]}`);
    });
  }

  addTransaction(transaction: Transaction) {
    const task = async () => {
      try {
        return await transaction.task();
      } catch (error) {
        throw { label: transaction.label, error };
      }
    };

    this.tasksSubject$.next({ ...transaction, task });
  }
}
