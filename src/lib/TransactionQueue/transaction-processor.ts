import { EventEmitter } from "events";
import { Transaction } from "./transaction";
import { TransactionStatus } from "./types";

/**
 * Manages the processing of transactions in a queue.
 */
export class TransactionProcessor extends EventEmitter {
  private queue: Transaction[] = [];
  private isProcessing: boolean = false;
  private currentTransaction: Transaction | null = null;

  /**
   * Creates a new TransactionProcessor instance.
   */
  constructor() {
    super();
  }

  /**
   * Adds a transaction to the processing queue.
   * @param transaction - The transaction to add
   */
  addTransaction(transaction: Transaction): void {
    this.queue.push(transaction);
    this.emit("transactionAdded", transaction);
    this.processQueue();
  }

  /**
   * Processes the queue of transactions.
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.setProcessing(true);
    this.currentTransaction = this.queue.shift()!;

    this.currentTransaction.on("statusChanged", (_, oldStatus, newStatus) => {
      this.emit(
        "transactionStatusChanged",
        this.currentTransaction,
        oldStatus,
        newStatus
      );
    });

    await this.currentTransaction.execute();

    if (this.currentTransaction.status === TransactionStatus.COMPLETED) {
      this.emit("transactionCompleted", this.currentTransaction);
    } else if (this.currentTransaction.status === TransactionStatus.FAILED) {
      this.emit("transactionFailed", this.currentTransaction);
    }

    this.currentTransaction = null;
    this.setProcessing(false);
    this.processQueue();
  }

  /**
   * Gets the current status of the queue.
   * @returns An object containing the queue length, processing status, and current transaction
   */
  getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    currentTransaction: Transaction | null;
  } {
    return {
      queueLength: this.queue.length,
      isProcessing: this.isProcessing,
      currentTransaction: this.currentTransaction,
    };
  }

  /**
   * Sets the processing status and emits an event if it changes.
   * @param processing - The new processing status
   */
  private setProcessing(processing: boolean): void {
    if (this.isProcessing !== processing) {
      this.isProcessing = processing;
      this.emit("processingStatusChanged", this.isProcessing);
    }
  }
}
