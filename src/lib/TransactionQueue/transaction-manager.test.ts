import { TransactionManager } from "./transaction-manager";
import { Transaction } from "./transaction";
import { TransactionStatus } from "./types";
import { TransactionProcessor } from "./transaction-processor";
import { TransactionHistory } from "./transaction-history";
import fs from "fs/promises";
import path from "path";

jest.mock("fs/promises");

describe("TransactionManager", () => {
  let manager: TransactionManager;
  const testDir = "./test_data";

  beforeEach(() => {
    manager = new TransactionManager(testDir);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.readFile as jest.Mock).mockResolvedValue("[]");
  });

  afterEach(async () => {
    await manager.clearHistory();
    jest.clearAllMocks();
  });

  it("should initialize and load transaction history", async () => {
    const mockTransactions = [
      { id: "1", label: "Test1", _status: TransactionStatus.COMPLETED },
      { id: "2", label: "Test2", _status: TransactionStatus.PENDING },
    ];
    (fs.readFile as jest.Mock).mockResolvedValue(
      JSON.stringify(mockTransactions)
    );

    await manager.initialize();

    expect(manager.getAllTransactions().length).toBe(2);
  });

  it("should add a transaction and update history", async () => {
    const transaction = await new Promise<Transaction>((resolve) => {
      manager.once("transactionAdded", resolve);
      manager.addTransaction("Test", async () => {});
    });

    expect(manager.getTransactionById(transaction.id)).toBeDefined();
    expect(manager.getAllTransactions()).toContainEqual(transaction);
  });

  it("should emit events for transaction lifecycle", async () => {
    const events: string[] = [];

    manager.on("transactionAdded", () => events.push("added"));
    manager.on("transactionStatusChanged", () => events.push("statusChanged"));
    manager.on("transactionCompleted", () => events.push("completed"));

    const transaction = manager.addTransaction("Test", async () => {});
    await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for async operations

    expect(events).toEqual([
      "added",
      "statusChanged",
      "statusChanged",
      "completed",
    ]);
  });

  it("should get transactions by status", async () => {
    const transaction1 = manager.addTransaction("Test1", async () => {});
    const transaction2 = manager.addTransaction("Test2", async () => {
      throw new Error("Test error");
    });

    await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for async operations

    expect(
      manager.getTransactionsByStatus(TransactionStatus.COMPLETED)
    ).toContainEqual(transaction1);
    expect(
      manager.getTransactionsByStatus(TransactionStatus.FAILED)
    ).toContainEqual(transaction2);
  });

  it("should get transactions by label", async () => {
    manager.addTransaction("Test1", async () => {});
    manager.addTransaction("Test2", async () => {});

    await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for async operations

    expect(manager.getTransactionsByLabel("Test1").length).toBe(1);
    expect(manager.getTransactionsByLabel("Test2").length).toBe(1);
  });

  it("should get transactions by date range", async () => {
    const now = new Date();
    const pastDate = new Date(now.getTime() - 1000);
    const futureDate = new Date(now.getTime() + 1000);

    manager.addTransaction("Test1", async () => {});
    await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for async operations

    const transactions = manager.getTransactionsByDateRange(
      pastDate,
      futureDate
    );
    expect(transactions.length).toBe(1);
  });

  it("should clear history", async () => {
    manager.addTransaction("Test", async () => {});
    await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for async operations

    await manager.clearHistory();
    expect(manager.getAllTransactions().length).toBe(0);
  });

  it("should get processor status", async () => {
    manager.addTransaction(
      "Test",
      async () => new Promise((resolve) => setTimeout(resolve, 50))
    );

    const status = manager.getProcessorStatus();
    expect(status.isProcessing).toBe(true);
    expect(status.queueLength).toBe(0);
    expect(status.currentTransaction).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 100)); // Wait for processing to complete

    const finalStatus = manager.getProcessorStatus();
    expect(finalStatus.isProcessing).toBe(false);
    expect(finalStatus.currentTransaction).toBeNull();
  });

  it("should expose processor and history objects", () => {
    expect(manager.processor).toBeInstanceOf(TransactionProcessor);
    expect(manager.history).toBeInstanceOf(TransactionHistory);
  });

  it("should allow direct access to processor methods", () => {
    const transaction = new Transaction("Test", async () => {
        new Promise((resolve) => setTimeout(() => resolve(true), 3000))
    });
    const transaction2 = new Transaction("Test", async () => {
        new Promise((resolve) => setTimeout(() => resolve(true), 3000))
    });
    manager.processor.addTransaction(transaction);
    manager.processor.addTransaction(transaction2);

    const status = manager.processor.getQueueStatus();
    expect(status.queueLength).toBe(1);
  });

  it("should allow direct access to history methods", async () => {
    const transaction = new Transaction("Test", async () => {});
    await manager.history.addTransaction(transaction);

    const retrievedTransaction = manager.history.getTransactionById(
      transaction.id
    );
    expect(retrievedTransaction).toBe(transaction);
  });

  it("should keep processor and history in sync", async () => {
    const transaction = manager.addTransaction("Test", async () => {});
    await new Promise((resolve) => setTimeout(resolve, 10)); // Wait for async operations

    const processorStatus = manager.processor.getQueueStatus();
    expect(processorStatus.queueLength).toBe(0); // Transaction should have been processed

    const historyTransactions = manager.history.getAllTransactions();
    expect(historyTransactions).toContainEqual(transaction);
  });
});
