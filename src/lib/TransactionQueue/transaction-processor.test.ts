import { TransactionProcessor } from "./transaction-processor";
import { Transaction } from "./transaction";
import { TransactionStatus } from "./types";

describe("TransactionProcessor", () => {
  let processor: TransactionProcessor;

  beforeEach(() => {
    processor = new TransactionProcessor();
  });

  it("should be initialized with an empty queue", () => {
    expect(processor.getQueueStatus().queueLength).toBe(0);
    expect(processor.getQueueStatus().isProcessing).toBe(false);
  });

  it("should add a transaction to the queue", () => {
    expect(processor.getQueueStatus().isProcessing).toBe(false);

    const transaction = new Transaction("Test", async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          return resolve(true);
        }, 3000);
      });
    });
    processor.addTransaction(transaction);
    expect(processor.getQueueStatus().isProcessing).toBe(true);
    expect(processor.getQueueStatus().queueLength).toBe(0);

    const transaction2 = new Transaction("Test2", async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          return resolve(true);
        }, 3000);
      });
    });
    processor.addTransaction(transaction2);
    expect(processor.getQueueStatus().queueLength).toBe(1);
  });

  it("should emit transactionAdded event when adding a transaction", (done) => {
    const transaction = new Transaction("Test", async () => {});
    processor.on("transactionAdded", (addedTransaction) => {
      expect(addedTransaction).toBe(transaction);
      done();
    });
    processor.addTransaction(transaction);
  });

  it("should process transactions in order", async () => {
    const results: number[] = [];
    const createTransaction = (delay: number, value: number) =>
      new Transaction(`Test ${value}`, async () => {
        await new Promise((resolve) => setTimeout(resolve, delay));
        results.push(value);
      });

    processor.addTransaction(createTransaction(30, 1));
    processor.addTransaction(createTransaction(10, 2));
    processor.addTransaction(createTransaction(20, 3));

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(results).toEqual([1, 2, 3]);
  });

  it("should emit transactionStatusChanged events", (done) => {
    const transaction = new Transaction("Test", async () => {});
    const statusChanges: TransactionStatus[] = [];

    processor.on("transactionStatusChanged", (_, oldStatus, newStatus) => {
      statusChanges.push(newStatus);
      if (newStatus === TransactionStatus.COMPLETED) {
        expect(statusChanges).toEqual([
          TransactionStatus.PROCESSING,
          TransactionStatus.COMPLETED,
        ]);
        done();
      }
    });

    processor.addTransaction(transaction);
  });

  it("should emit transactionCompleted event for successful transactions", (done) => {
    const transaction = new Transaction("Test", async () => {});

    processor.on("transactionCompleted", (completedTransaction) => {
      expect(completedTransaction).toBe(transaction);
      expect(completedTransaction.status).toBe(TransactionStatus.COMPLETED);
      done();
    });

    processor.addTransaction(transaction);
  });

  it("should emit transactionFailed event for failed transactions", (done) => {
    const transaction = new Transaction("Test", async () => {
      throw new Error("Test error");
    });

    processor.on("transactionFailed", (failedTransaction) => {
      expect(failedTransaction).toBe(transaction);
      expect(failedTransaction.status).toBe(TransactionStatus.FAILED);
      done();
    });

    processor.addTransaction(transaction);
  });

  it("should process next transaction after current one is completed", async () => {
    const transaction1 = new Transaction("Test 1", async () => {});
    const transaction2 = new Transaction("Test 2", async () => {});

    processor.addTransaction(transaction1);
    processor.addTransaction(transaction2);

    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(transaction1.status).toBe(TransactionStatus.COMPLETED);
    expect(transaction2.status).toBe(TransactionStatus.COMPLETED);
  });

  it("should handle concurrent addTransaction calls", async () => {
    const transactions = Array.from(
      { length: 10 },
      (_, i) =>
        new Transaction(`Test ${i}`, async () => {
          await new Promise((resolve) =>
            setTimeout(resolve, Math.random() * 10)
          );
        })
    );

    transactions.forEach((t) => processor.addTransaction(t));

    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(processor.getQueueStatus().queueLength).toBe(0);
    expect(
      transactions.every((t) => t.status === TransactionStatus.COMPLETED)
    ).toBe(true);
  });

  it("should update isProcessing flag correctly", async () => {
    const longTransaction = new Transaction("Long Test", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    processor.addTransaction(longTransaction);

    // Check immediately after adding
    expect(processor.getQueueStatus().isProcessing).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check after transaction should be completed
    expect(processor.getQueueStatus().isProcessing).toBe(false);
  });

  it("should provide the current processing transaction", async () => {
    const transaction = new Transaction("Test", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    processor.addTransaction(transaction);

    // Wait a bit for the transaction to start processing
    await new Promise((resolve) => setTimeout(resolve, 10));

    const status = processor.getQueueStatus();
    expect(status.isProcessing).toBe(true);
    expect(status.currentTransaction).toBe(transaction);

    // Wait for the transaction to complete
    await new Promise((resolve) => setTimeout(resolve, 50));

    const finalStatus = processor.getQueueStatus();
    expect(finalStatus.isProcessing).toBe(false);
    expect(finalStatus.currentTransaction).toBeNull();
  });

  it("should emit processingStatusChanged event", (done) => {
    const transaction = new Transaction("Test", async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    let processingChanges: boolean[] = [];

    processor.on("processingStatusChanged", (isProcessing) => {
      processingChanges.push(isProcessing);
      if (processingChanges.length === 2) {
        expect(processingChanges).toEqual([true, false]);
        done();
      }
    });

    processor.addTransaction(transaction);
  });

  it("should handle multiple transactions and update currentTransaction correctly", async () => {
    const transaction1 = new Transaction("Test 1", async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    const transaction2 = new Transaction("Test 2", async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });

    processor.addTransaction(transaction1);
    processor.addTransaction(transaction2);

    // Check after first transaction starts
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(processor.getQueueStatus().currentTransaction).toBe(transaction1);

    // Check after first transaction completes and second starts
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(processor.getQueueStatus().currentTransaction).toBe(transaction2);

    // Check after all transactions complete
    await new Promise((resolve) => setTimeout(resolve, 40));
    expect(processor.getQueueStatus().currentTransaction).toBeNull();
  });
});
