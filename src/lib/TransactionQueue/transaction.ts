import { v4 as uuidv4 } from "uuid";
import { EventEmitter } from "events";

import { TransactionStatus, ExecutionAttempt, ITransaction } from "./types";

/**
 * Represents a transaction with retry capabilities.
 */
export class Transaction extends EventEmitter implements ITransaction {
  /** Unique identifier for the transaction */
  readonly id: string;

  /** Descriptive label for the transaction */
  readonly label: string;

  /** Current status of the transaction */
  private _status: TransactionStatus;

  /** The task to be executed by this transaction */
  private _task: () => Promise<any>;

  /** Maximum number of retry attempts */
  private _maxRetries: number;

  /** Current retry count */
  private _retryCount: number;

  /** Array of execution attempts */
  private _executionAttempts: ExecutionAttempt[];

  /** Array of additional payload data (metadata) */
  private readonly _payload: any[];

  /**  It's only used for tasks that are loaded from disk and have no implementation*/
  public readonly noImpl: boolean;

  /**
   * Creates a new Transaction instance.
   * @param label - A descriptive label for the transaction
   * @param task - The asynchronous task to be executed by this transaction
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   */
  constructor(
    label: string,
    task: () => Promise<any>,
    payload: any[] = [],
    maxRetries: number = 3,
    noImpl: boolean = false
  ) {
    super();
    this.id = uuidv4();
    this.label = label;
    this._status = TransactionStatus.PENDING;
    this._task = task;
    this._payload = payload;
    this._maxRetries = maxRetries;
    this._retryCount = 0;
    this._executionAttempts = [];
    this.noImpl = noImpl;
  }

  /**
   * Gets the current status of the transaction.
   */
  get status(): TransactionStatus {
    return this._status;
  }

  /**
   * Gets the result of the last execution attempt.
   */
  get result(): any {
    const lastAttempt =
      this._executionAttempts[this._executionAttempts.length - 1];
    return lastAttempt ? lastAttempt.result : null;
  }

  /**
   * Gets the error of the last execution attempt.
   */
  get error(): Error | null {
    const lastAttempt =
      this._executionAttempts[this._executionAttempts.length - 1];
    return lastAttempt ? lastAttempt.error : null;
  }

  /**
   * Gets the current retry count.
   */
  get retryCount(): number {
    return this._retryCount;
  }

  /**
   * Gets the maximum number of retry attempts.
   */
  get maxRetries(): number {
    return this._maxRetries;
  }

  /**
   * Gets all execution attempts.
   */
  get executionAttempts(): ExecutionAttempt[] {
    return [...this._executionAttempts];
  }

  /**
   * Gets the payload data (metadata) associated with this transaction.
   */
  get payload(): any[] {
    return [...this._payload];
  }

  /**
   * Sets the status of the transaction and emits a 'statusChanged' event.
   * @param newStatus - The new status to set
   */
  private setStatus(newStatus: TransactionStatus): void {
    if (this._status !== newStatus) {
      const oldStatus = this._status;
      this._status = newStatus;
      this.emit("statusChanged", this, oldStatus, newStatus);
    }
  }

  /**
   * Executes the transaction's task with retry logic.
   * Updates the transaction's status, result, and error properties based on the execution outcome.
   * Emits 'statusChanged' events as the transaction progresses.
   * @returns A promise that resolves when the transaction is complete (either succeeded or failed after all retries)
   */
  async execute(): Promise<void> {
    this.setStatus(TransactionStatus.PROCESSING);

    while (this._retryCount <= this._maxRetries) {
      try {
        const result = await this._task();
        this._executionAttempts.push({
          result,
          error: null,
          timestamp: new Date(),
        });
        this.setStatus(TransactionStatus.COMPLETED);
        return;
      } catch (error) {
        this._executionAttempts.push({
          result: null,
          error: error as Error,
          timestamp: new Date(),
        });

        if (this._retryCount < this._maxRetries) {
          this._retryCount++;
          this.setStatus(TransactionStatus.RETRYING);
        } else {
          this.setStatus(TransactionStatus.FAILED);
          return;
        }
      }
    }
  }

  /**
   * Resets the transaction to its initial state and re-executes it.
   * @returns A promise that resolves when the re-execution is complete
   */
  async reexecute(): Promise<void> {
    this._retryCount = 0;
    this._executionAttempts = [];
    this.setStatus(TransactionStatus.PENDING);
    return this.execute();
  }
}
