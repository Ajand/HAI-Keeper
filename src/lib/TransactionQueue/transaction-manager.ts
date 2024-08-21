import { EventEmitter } from "events";
import { Transaction } from "./transaction";
import { TransactionStatus } from "./types";
import { TransactionProcessor } from "./transaction-processor";
import { TransactionHistory } from "./transaction-history";

/**
 * Manages the overall transaction system, coordinating between the processor and history.
 */
export class TransactionManager
  extends EventEmitter
  implements TransactionManager
{
  /** The transaction processor instance */
  public readonly processor: TransactionProcessor;

  /** The transaction history instance */
  public readonly history: TransactionHistory;

  /**
   * Creates a new TransactionManager instance.
   * @param storageDirectory - The directory to store transaction history (default: './data')
   */
  constructor(storageDirectory: string = "./data") {
    super();
    this.processor = new TransactionProcessor();
    this.history = new TransactionHistory(storageDirectory);

    this.processor.on("transactionAdded", this.onTransactionAdded.bind(this));
    this.processor.on(
      "transactionStatusChanged",
      this.onTransactionStatusChanged.bind(this)
    );
    this.processor.on(
      "transactionCompleted",
      this.onTransactionCompleted.bind(this)
    );
    this.processor.on("transactionFailed", this.onTransactionFailed.bind(this));
    this.processor.on(
      "processingStatusChanged",
      this.onProcessingStatusChanged.bind(this)
    );
  }

  /**
   * Initializes the TransactionManager by loading the transaction history.
   */
  async initialize(): Promise<void> {
    await this.history.loadFromFile();
  }

  /**
   * Creates and adds a new transaction to the system.
   * @param label - The label for the new transaction
   * @param task - The task to be executed by the transaction
   * @param payload - Additional metadata for the transaction
   * @param maxRetries - The maximum number of retries for the transaction
   * @returns The created transaction
   */
  addTransaction(
    label: string,
    task: () => Promise<any>,
    payload: any[] = [],
    maxRetries: number = 3
  ): Transaction {
    const transaction = new Transaction(label, task, payload, maxRetries);
    this.processor.addTransaction(transaction);
    return transaction;
  }

  /**
   * Gets the current status of the transaction processor.
   * @returns An object containing the queue length, processing status, and current transaction
   */
  getProcessorStatus(): {
    queueLength: number;
    isProcessing: boolean;
    currentTransaction: Transaction | null;
  } {
    return this.processor.getQueueStatus();
  }

  /**
   * Gets a transaction by its ID.
   * @param id - The ID of the transaction to retrieve
   * @returns The transaction if found, undefined otherwise
   */
  getTransactionById(id: string): Transaction | undefined {
    return this.history.getTransactionById(id);
  }

  /**
   * Gets all transactions in the history.
   * @returns An array of all transactions
   */
  getAllTransactions(): Transaction[] {
    return this.history.getAllTransactions();
  }

  /**
   * Gets transactions by their status.
   * @param status - The status to filter by
   * @returns An array of transactions with the specified status
   */
  getTransactionsByStatus(status: TransactionStatus): Transaction[] {
    return this.history.getTransactionsByStatus(status);
  }

  /**
   * Gets transactions by their label.
   * @param label - The label to filter by
   * @returns An array of transactions with the specified label
   */
  getTransactionsByLabel(label: string): Transaction[] {
    return this.history.getTransactionsByLabel(label);
  }

  /**
   * Gets transactions within a date range.
   * @param startDate - The start date of the range
   * @param endDate - The end date of the range
   * @returns An array of transactions within the specified date range
   */
  getTransactionsByDateRange(startDate: Date, endDate: Date): Transaction[] {
    return this.history.getTransactionsByDateRange(startDate, endDate);
  }

  /**
   * Clears all transactions from the history.
   */
  async clearHistory(): Promise<void> {
    await this.history.clearHistory();
  }

  private async onTransactionAdded(transaction: Transaction): Promise<void> {
    this.emit("transactionAdded", transaction);
    await this.history.addTransaction(transaction);
  }

  private onTransactionStatusChanged(
    transaction: Transaction,
    oldStatus: TransactionStatus,
    newStatus: TransactionStatus
  ): void {
    this.emit("transactionStatusChanged", transaction, oldStatus, newStatus);
  }

  private onTransactionCompleted(transaction: Transaction): void {
    this.emit("transactionCompleted", transaction);
  }

  private onTransactionFailed(transaction: Transaction): void {
    this.emit("transactionFailed", transaction);
  }

  private onProcessingStatusChanged(isProcessing: boolean): void {
    this.emit("processingStatusChanged", isProcessing);
  }
}
