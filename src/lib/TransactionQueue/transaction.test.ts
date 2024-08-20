// Transaction.test.ts
import { Transaction } from "./transaction";
import { TransactionStatus } from "./types";

describe("Transaction", () => {
  it("should create a transaction with a unique id and pending status", () => {
    const transaction = new Transaction("Test Transaction", async () => {});
    expect(transaction.id).toBeDefined();
    expect(transaction.label).toBe("Test Transaction");
    expect(transaction.status).toBe(TransactionStatus.PENDING);
    expect(transaction.result).toBeNull();
    expect(transaction.error).toBeNull();
    expect(transaction.retryCount).toBe(0);
    expect(transaction.maxRetries).toBe(3);
    expect(transaction.executionAttempts).toEqual([]);
    expect(transaction.payload).toEqual([]);
  });

  it("should create a transaction with custom payload and maxRetries", () => {
    const payload = [{ key: "value" }];
    const transaction = new Transaction(
      "Custom Transaction",
      async () => {},
      payload,
      5
    );
    expect(transaction.payload).toEqual(payload);
    expect(transaction.maxRetries).toBe(5);
  });

  it("should execute a successful transaction", async () => {
    const expectedResult = "Success";
    const transaction = new Transaction(
      "Success Transaction",
      async () => expectedResult
    );

    await transaction.execute();

    expect(transaction.status).toBe(TransactionStatus.COMPLETED);
    expect(transaction.result).toBe(expectedResult);
    expect(transaction.error).toBeNull();
    expect(transaction.retryCount).toBe(0);
    expect(transaction.executionAttempts.length).toBe(1);
  });

  it("should handle a failed transaction with retries", async () => {
    let attempts = 0;
    const transaction = new Transaction(
      "Retry Transaction",
      async () => {
        attempts++;
        if (attempts < 3) throw new Error("Retry error");
        return "Success after retries";
      },
      [],
      3
    );

    await transaction.execute();

    expect(transaction.status).toBe(TransactionStatus.COMPLETED);
    expect(transaction.result).toBe("Success after retries");
    expect(transaction.error).toBeNull();
    expect(transaction.retryCount).toBe(2);
    expect(transaction.executionAttempts.length).toBe(3);
  });

  it("should fail after max retries", async () => {
    const expectedError = new Error("Test error");
    const transaction = new Transaction(
      "Fail Transaction",
      async () => {
        throw expectedError;
      },
      [],
      2
    );

    await transaction.execute();

    expect(transaction.status).toBe(TransactionStatus.FAILED);
    expect(transaction.result).toBeNull();
    expect(transaction.error).toBe(expectedError);
    expect(transaction.retryCount).toBe(2);
    expect(transaction.executionAttempts.length).toBe(3);
  });

  it("should emit statusChanged events", async () => {
    const transaction = new Transaction("Event Test", async () => {}, [], 1);

    const statusChanges: Array<[TransactionStatus, TransactionStatus]> = [];
    transaction.on("statusChanged", (_, oldStatus, newStatus) => {
      statusChanges.push([oldStatus, newStatus]);
    });

    await transaction.execute();

    expect(statusChanges).toEqual([
      [TransactionStatus.PENDING, TransactionStatus.PROCESSING],
      [TransactionStatus.PROCESSING, TransactionStatus.COMPLETED],
    ]);
  });

  it("should reexecute the transaction", async () => {
    let attempts = 0;
    const transaction = new Transaction(
      "Reexecute Test",
      async () => {
        attempts++;
        if (attempts === 1) throw new Error("First attempt error");
        return "Success on reexecution";
      },
      [],
      0
    );

    await transaction.execute();
    expect(transaction.status).toBe(TransactionStatus.FAILED);

    await transaction.reexecute();
    expect(transaction.status).toBe(TransactionStatus.COMPLETED);
    expect(transaction.result).toBe("Success on reexecution");
    expect(transaction.retryCount).toBe(0);
    expect(transaction.executionAttempts.length).toBe(1);
  });

  it("should retain payload after execution and reexecution", async () => {
    const payload = [{ key: "value" }];
    const transaction = new Transaction(
      "Payload Test",
      async () => {},
      payload
    );

    await transaction.execute();
    expect(transaction.payload).toEqual(payload);

    await transaction.reexecute();
    expect(transaction.payload).toEqual(payload);
  });

  it("should not allow modification of the payload through the getter", () => {
    const initialPayload = [{ key: "value" }];
    const transaction = new Transaction(
      "Immutable Payload Test",
      async () => {},
      initialPayload
    );
    const payloadCopy = transaction.payload;
    payloadCopy.push({ newKey: "newValue" });
    expect(transaction.payload).toEqual(initialPayload);
  });
});
