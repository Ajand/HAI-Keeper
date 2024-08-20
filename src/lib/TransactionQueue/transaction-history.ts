import fs from "fs/promises";
import path from "path";
import { Transaction } from "./transaction";
import { TransactionStatus } from "./types";

export class TransactionHistory {
  private transactions: Transaction[] = [];
  private filePath: string;

  constructor(storageDirectory: string = "./data") {
    this.filePath = path.join(storageDirectory, "transaction_history.json");
  }

  /**
   * Adds a transaction to the history.
   * @param transaction - The transaction to add
   */
  async addTransaction(transaction: Transaction): Promise<void> {
    this.transactions.push(transaction);
    await this.saveToFile();
  }

  /**
   * Gets all transactions.
   * @returns An array of all transactions
   */
  getAllTransactions(): Transaction[] {
    return [...this.transactions];
  }

  /**
   * Gets transactions by status.
   * @param status - The status to filter by
   * @returns An array of transactions with the specified status
   */
  getTransactionsByStatus(status: TransactionStatus): Transaction[] {
    return this.transactions.filter((t) => t.status === status);
  }

  /**
   * Gets transactions by label.
   * @param label - The label to filter by
   * @returns An array of transactions with the specified label
   */
  getTransactionsByLabel(label: string): Transaction[] {
    return this.transactions.filter((t) => t.label === label);
  }

  /**
   * Gets a transaction by its ID.
   * @param id - The ID of the transaction to retrieve
   * @returns The transaction if found, undefined otherwise
   */
  getTransactionById(id: string): Transaction | undefined {
    return this.transactions.find((t) => t.id === id);
  }

  /**
   * Gets transactions within a date range.
   * @param startDate - The start date of the range
   * @param endDate - The end date of the range
   * @returns An array of transactions within the specified date range
   */
  getTransactionsByDateRange(startDate: Date, endDate: Date): Transaction[] {
    return this.transactions.filter((t) => {
      const lastAttempt = t.executionAttempts[t.executionAttempts.length - 1];
      if (lastAttempt) {
        return (
          lastAttempt.timestamp >= startDate && lastAttempt.timestamp <= endDate
        );
      }
      return false;
    });
  }

  /**
   * Saves the current transactions to a file.
   */
  private async saveToFile(): Promise<void> {
    const data = JSON.stringify(
      this.transactions,
      (key, value) => {
        if (key === "_task") {
          return undefined; // Exclude the task function from serialization
        }
        return value;
      },
      2
    );
    await fs.writeFile(this.filePath, data, "utf8");
  }

  /**
   * Loads transactions from the file.
   */
  async loadFromFile(): Promise<void> {
    try {
      const data = await fs.readFile(this.filePath, "utf8");
      let parsedData;
      try {
        parsedData = JSON.parse(data);
      } catch (parseError) {
        console.error("Error parsing transaction history file:", parseError);
        // If the file is corrupted, start with an empty array
        this.transactions = [];
        return;
      }
      this.transactions = parsedData.map((t: any) => {
        const transaction = new Transaction(
          t.label,
          async () => {},
          t._payload,
          t._maxRetries,
          true
        );
        Object.assign(transaction, t);
        return transaction;
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
      // File doesn't exist, start with an empty array
      this.transactions = [];
    }
  }
  /**
   * Clears all transactions from memory and the file.
   */
  async clearHistory(): Promise<void> {
    this.transactions = [];
    await this.saveToFile();
  }
}
