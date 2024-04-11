import {
  from,
  Subject,
  concatMap,
  BehaviorSubject,
  retry,
  defer,
  map,
} from "rxjs";
import { Logger } from "pino";
import logger from "../logger";

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
  log: Logger;

  idleTimer: any; // Timer to track IDLE state duration
  readonly IDLE_TIMEOUT = 10000; // 10 seconds

  constructor(retryCount: number, keeperAddress: string = "") {
    this.log = logger.child({ module: "TransactionQueue" });
    this.log.debug({ message: "Transaction Queue initiated" });

    this.tasksSubject$ = new Subject<Transaction>();
    this.status$ = new BehaviorSubject<QueStatus>(QueStatus.IDLE);

    this.idleTimer = null;

    this.tasksSubject$
      .pipe(
        concatMap((transaction) => {
          this.status$.next(QueStatus.WORKING);
          this.log.debug(`Starting transaction: ${transaction.label}`, {
            label: transaction.label,
          });

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
          this.log.debug(`Transaction completed: ${label}`, { label });
          this.startIdleTimer();
        },
        error: (err: any) => {
          this.log.error(
            `${err.label} Transaction failed after ${retryCount} retries.`,
            { retryCount, error: err }
          );

          this.status$.next(QueStatus.FAILED);
          this.log.debug(`Transaction failed: ${err.label}`, {
            label: err.label,
          });
          this.startIdleTimer();
        },
      });

    this.status$.subscribe((v) => {
      this.log.info(`Transaction Queue Status: ${QueStatus[v]}`, {
        status: QueStatus[v],
      });
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
        this.log.error(`Failed to do the transaction`, {
          label: transaction.label,
          transaction,
        });
        throw { label: transaction.label, error };
      }
    };

    this.tasksSubject$.next({ ...transaction, task });
    this.log.debug(`Transaction added: ${transaction.label}`, {
      label: transaction.label,
    });
  }
}
