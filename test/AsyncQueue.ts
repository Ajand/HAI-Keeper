import { from, retry, defer } from "rxjs";

import { TransactionQueue } from "../src/lib/TransactionQueue";

import { sleep } from "./utils";

describe("Transaction Queue", () => {
  it("Should return the proper result with async function", async () => {
    const queue = new TransactionQueue(5);

    queue.status$.subscribe((queueStatus) =>
      console.log("queStatus is: ", queueStatus)
    );

    const taskOne = async () => {
      console.log("started the sleeping 1");
      await sleep(2500);
      console.log("this is task 1");
    };

    const taskTwo = async () => {
      console.log("started the sleeping 2");
      await sleep(5000);
      console.log("this is task 2");
    };

    const failChanceTask = async () => {
      // Generate a random number between 0 and 1
      const random = Math.random();

      // If the random number is less than 0.8 (80% probability),
      // simulate a failure by throwing an error

      console.log("The random number is: ", random);

      await sleep(100);

      if (random < 0.99) {
        throw new Error("Task failed");
      } else {
        // If the random number is greater than or equal to 0.8 (20% probability),
        // simulate success by returning a resolved promise

        return random;
      }
    };

    //defer(() => from(failChanceTask()))
    //  .pipe(retry(5))
    //  .subscribe({
    //    next: (v) => console.log(`subscribing to result: ${v}`),
    //    error: (err: any) => {
    //      console.error(`Transaction failed after ${5} retries.`);
    //    },
    //  });
    //
    //console.log("start of the async queue");

    queue.addTransaction({
      label: "Fail Chance Transaction",
      task: failChanceTask,
    });

    await sleep(20000);
  });
});
