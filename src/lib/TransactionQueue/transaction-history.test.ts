import { TransactionHistory } from "./transaction-history";
import { Transaction } from "./transaction";
import { TransactionStatus } from "./types";
import fs from "fs/promises";
import path from "path";

jest.mock("fs/promises");

describe("TransactionHistory", () => {
  let history: TransactionHistory;
  const testDir = "./test_data";

  beforeEach(() => {
    history = new TransactionHistory(testDir);
  });

  afterEach(async () => {
    await history.clearHistory();
  });

  it("should add and retrieve transactions", async () => {
    const transaction = new Transaction("Test", async () => {});
    await history.addTransaction(transaction);
    expect(history.getAllTransactions()).toContainEqual(transaction);
  });

  it("should get transactions by status", async () => {
    const transaction1 = new Transaction("Test1", async () => {});
    const transaction2 = new Transaction("Test2", async () => {});
    await transaction1.execute();
    await history.addTransaction(transaction1);
    await history.addTransaction(transaction2);

    const completedTransactions = history.getTransactionsByStatus(
      TransactionStatus.COMPLETED
    );
    expect(completedTransactions).toContainEqual(transaction1);
    expect(completedTransactions).not.toContainEqual(transaction2);
  });

  it("should get transactions by label", async () => {
    const transaction1 = new Transaction("Test1", async () => {});
    const transaction2 = new Transaction("Test2", async () => {});
    await history.addTransaction(transaction1);
    await history.addTransaction(transaction2);

    const test1Transactions = history.getTransactionsByLabel("Test1");
    expect(test1Transactions).toContainEqual(transaction1);
    expect(test1Transactions).not.toContainEqual(transaction2);
  });

  it("should get transaction by id", async () => {
    const transaction = new Transaction("Test", async () => {});
    await history.addTransaction(transaction);

    const retrievedTransaction = history.getTransactionById(transaction.id);
    expect(retrievedTransaction).toEqual(transaction);
  });

  it("should get transactions by date range", async () => {
    const transaction1 = new Transaction("Test1", async () => {});
    const transaction2 = new Transaction("Test2", async () => {});
    await transaction1.execute();
    await new Promise((resolve) => setTimeout(resolve, 10));
    await transaction2.execute();

    await history.addTransaction(transaction1);
    await history.addTransaction(transaction2);

    const middleDate = new Date(
      transaction1.executionAttempts[0].timestamp.getTime() + 5
    );
    const laterTransactions = history.getTransactionsByDateRange(
      middleDate,
      new Date()
    );
    expect(laterTransactions).toContainEqual(transaction2);
    expect(laterTransactions).not.toContainEqual(transaction1);
  });

  it("should save and load transactions from file", async () => {
    const transaction = new Transaction("Test", async () => {});
    await history.addTransaction(transaction);

    // Mock the file content that would be saved
    const mockFileContent = JSON.stringify([
      {
        id: transaction.id,
        label: transaction.label,
        _status: transaction.status,
        _payload: [],
        _maxRetries: 3,
        _retryCount: 0,
        _executionAttempts: [],
      },
    ]);

    // Mock reading the file content
    (fs.readFile as jest.Mock).mockResolvedValue(mockFileContent);

    const newHistory = new TransactionHistory(testDir);
    await newHistory.loadFromFile();

    const loadedTransactions = newHistory.getAllTransactions();
    expect(loadedTransactions[0]).toMatchObject({
      id: transaction.id,
      label: transaction.label,
      status: transaction.status,
    });
  });

  it("should handle file not found when loading", async () => {
    (fs.readFile as jest.Mock).mockRejectedValueOnce({ code: "ENOENT" });
    await expect(history.loadFromFile()).resolves.not.toThrow();
    expect(history.getAllTransactions()).toEqual([]);
  });

  it("should handle corrupted JSON when loading", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    (fs.readFile as jest.Mock).mockResolvedValue("corrupted JSON");

    await expect(history.loadFromFile()).resolves.not.toThrow();
    expect(history.getAllTransactions()).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      "Error parsing transaction history file:",
      expect.any(SyntaxError)
    );

    consoleSpy.mockRestore();
  });
});
