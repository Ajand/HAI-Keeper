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
  DONE, // New status
}

export interface Transaction {
  label: string;
  task: Task;
}

export class TransactionQueue {
  tasksSubject$: Subject<Transaction>;
  status$: BehaviorSubject<QueStatus>;

  idleTimer: any; // Timer to track IDLE state duration
  readonly IDLE_TIMEOUT = 10000; // 10 seconds

  constructor(retryCount: number) {
    console.info("Transaction Queue initiated");
    this.tasksSubject$ = new Subject<Transaction>();
    this.status$ = new BehaviorSubject<QueStatus>(QueStatus.IDLE);

    this.idleTimer = null;

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
          clearTimeout(this.idleTimer); // Clear the timer on any activity
          this.status$.next(QueStatus.IDLE);
          this.startIdleTimer();
        },
        error: (err: any) => {
          console.error(
            `${err.label} Transaction failed after ${retryCount} retries.\n`,
            err
          );
          this.status$.next(QueStatus.FAILED);
          this.startIdleTimer();
        },
      });

    this.status$.subscribe((v) => {
      console.info(`||| Transaction Queue Status: ${QueStatus[v]}`);
    });
  }

  startIdleTimer() {
    this.idleTimer = setTimeout(() => {
      this.status$.next(QueStatus.DONE);
    }, this.IDLE_TIMEOUT);
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
