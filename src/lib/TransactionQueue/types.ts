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
