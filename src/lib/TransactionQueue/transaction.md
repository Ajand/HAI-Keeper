# Transaction Module Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Transaction Class](#transaction-class)
3. [TransactionProcessor Class](#transactionprocessor-class)
4. [TransactionHistory Class](#transactionhistory-class)
5. [TransactionManager Class](#transactionmanager-class)
6. [Usage Examples](#usage-examples)
7. [Extending the Module](#extending-the-module)
8. [Error Handling and Logging](#error-handling-and-logging)

## Introduction

The Transaction module is a core component in a flexible DeFi keeper system, focusing on managing, processing, and storing transactions. This module is responsible for handling transaction lifecycle, from creation to execution and historical tracking.

## Transaction Class

The `Transaction` class represents a single transaction in the keeper system. It encapsulates the logic for initializing, executing, and tracking the status of a transaction.

### Key Features

- Initialization with transaction details
- Asynchronous execution with retry logic
- Event emission for status changes
- Tracking of execution attempts

### Class Structure

```typescript
export class Transaction extends EventEmitter {
  constructor(
    public readonly label: string,
    private _task: () => Promise<any>,
    payload: any[] = [],
    maxRetries: number = 3,
    noImpl: boolean = false
  ) {}

  public async execute(): Promise<void> {
    /* ... */
  }
  public async reexecute(): Promise<void> {
    /* ... */
  }
  // Getter methods for various properties
}
```

## TransactionProcessor Class

The `TransactionProcessor` class manages the processing of transactions in a queue.

### Key Features

- Adding transactions to the processing queue
- Asynchronous processing of queued transactions
- Event emission for transaction status changes
- Reporting of queue status

### Class Structure

```typescript
export class TransactionProcessor extends EventEmitter {
  constructor() {
    /* ... */
  }

  public addTransaction(transaction: Transaction): void {
    /* ... */
  }
  private async processQueue(): Promise<void> {
    /* ... */
  }
  public getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    currentTransaction: Transaction | null;
  } {
    /* ... */
  }
}
```

## TransactionHistory Class

The `TransactionHistory` class is responsible for storing and retrieving transaction history.

### Key Features

- Adding transactions to history
- Retrieving transactions based on various criteria
- Persisting transaction history to file
- Loading transaction history from file

### Class Structure

```typescript
export class TransactionHistory {
  constructor(storageDirectory: string = "./data") {
    /* ... */
  }

  public async addTransaction(transaction: Transaction): Promise<void> {
    /* ... */
  }
  public getAllTransactions(): Transaction[] {
    /* ... */
  }
  public getTransactionsByStatus(status: TransactionStatus): Transaction[] {
    /* ... */
  }
  // Other getter methods
  private async saveToFile(): Promise<void> {
    /* ... */
  }
  public async loadFromFile(): Promise<void> {
    /* ... */
  }
  public async clearHistory(): Promise<void> {
    /* ... */
  }
}
```

## TransactionManager Class

The `TransactionManager` class serves as the main interface for the Transaction module, coordinating between the TransactionProcessor and TransactionHistory.

### Key Features

- Creating and adding new transactions
- Initializing the transaction system
- Providing access to processor status and transaction history
- Event emission for transaction lifecycle events

### Class Structure

```typescript
export class TransactionManager extends EventEmitter {
  constructor(storageDirectory: string = "./data") {
    /* ... */
  }

  public async initialize(): Promise<void> {
    /* ... */
  }
  public addTransaction(
    label: string,
    task: () => Promise<any>,
    payload: any[] = [],
    maxRetries: number = 3
  ): Transaction {
    /* ... */
  }
  // Getter methods for transactions and processor status
  // Event handler methods
}
```

## Usage Examples

### Creating and Processing a Transaction

```typescript
import { TransactionManager } from "./transaction-manager";

// Create TransactionManager instance
const manager = new TransactionManager();

// Initialize the manager
await manager.initialize();

// Create and add a new transaction
const transaction = manager.addTransaction(
  "Example Transaction",
  async () => {
    // Transaction task logic
    console.log("Executing transaction");
  }
);

// Listen for transaction events
manager.on("transactionCompleted", (completedTransaction) => {
  console.log(`Transaction ${completedTransaction.id} completed`);
});

// Get processor status
const status = manager.getProcessorStatus();
console.log("Current processor status:", status);
```

### Retrieving Transaction History

```typescript
// Get all transactions
const allTransactions = manager.getAllTransactions();

// Get transactions by status
const completedTransactions = manager.getTransactionsByStatus(TransactionStatus.COMPLETED);

// Get transactions by date range
const startDate = new Date("2023-01-01");
const endDate = new Date("2023-12-31");
const transactionsInRange = manager.getTransactionsByDateRange(startDate, endDate);
```

## Extending the Module

To extend the module, you can create custom transaction types by extending the `Transaction` class:

```typescript
class CustomTransaction extends Transaction {
  constructor(
    label: string,
    task: () => Promise<any>,
    public customProperty: string
  ) {
    super(label, task);
    this.customProperty = customProperty;
  }

  async customMethod(): Promise<void> {
    // Custom logic
  }
}
```

You can then use this custom transaction type with the TransactionManager:

```typescript
const customTransaction = new CustomTransaction(
  "Custom Transaction",
  async () => { /* ... */ },
  "Custom Value"
);
manager.processor.addTransaction(customTransaction);
```

## Error Handling and Logging

The Transaction module uses console logging for error reporting. To implement more advanced logging:

1. Create a logger interface:

```typescript
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}
```

2. Implement the interface:

```typescript
export class CustomLogger implements ILogger {
  debug(message: string, ...args: any[]): void {
    console.log(`[DEBUG] ${message}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
}
```

3. Update the TransactionManager, TransactionProcessor, and TransactionHistory classes to accept a logger in their constructors and use it for logging.

This approach allows for flexible and customizable logging throughout the Transaction module.