import { EventEmitter } from "events";

export enum TransactionStatus {
  PENDING = "PENDING",
  PROCESSING = "PROCESSING",
  RETRYING = "RETRYING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

export interface ExecutionAttempt {
  result: any;
  error: Error | null;
  timestamp: Date;
}

export interface ITransaction extends EventEmitter {
  readonly id: string;
  readonly label: string;
  readonly noImpl: boolean;
  status: TransactionStatus;
  result: any;
  error: Error | null;
  retryCount: number;
  maxRetries: number;
  executionAttempts: ExecutionAttempt[];
  payload: any[];

  execute(): Promise<void>;
  reexecute(): Promise<void>;
}

export interface ITransactionProcessor extends EventEmitter {
  addTransaction(transaction: ITransaction): void;
  getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    currentTransaction: ITransaction | null;
  };
}

export interface ITransactionHistory {
  addTransaction(transaction: ITransaction): Promise<void>;
  getAllTransactions(): ITransaction[];
  getTransactionsByStatus(status: TransactionStatus): ITransaction[];
  getTransactionsByLabel(label: string): ITransaction[];
  getTransactionById(id: string): ITransaction | undefined;
  getTransactionsByDateRange(startDate: Date, endDate: Date): ITransaction[];
  loadFromFile(): Promise<void>;
  clearHistory(): Promise<void>;
}

export interface ITransactionManager extends EventEmitter {
  readonly processor: ITransactionProcessor;
  readonly history: ITransactionHistory;

  initialize(): Promise<void>;
  addTransaction(
    label: string,
    task: () => Promise<any>,
    payload?: any[],
    maxRetries?: number
  ): ITransaction;
  getProcessorStatus(): {
    queueLength: number;
    isProcessing: boolean;
    currentTransaction: ITransaction | null;
  };
  getTransactionById(id: string): ITransaction | undefined;
  getAllTransactions(): ITransaction[];
  getTransactionsByStatus(status: TransactionStatus): ITransaction[];
  getTransactionsByLabel(label: string): ITransaction[];
  getTransactionsByDateRange(startDate: Date, endDate: Date): ITransaction[];
  clearHistory(): Promise<void>;
}
