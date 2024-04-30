import { ArgsParser } from "./Keeper/Initializer";
import Keeper from "./Keeper";

import { sleep } from "./Keeper";
import { startAPI } from "./api";

const main = async () => {
  const args = process.argv.slice(2);

  const keeper = new Keeper(args);

  await startAPI(keeper);

  const gracefulShutdown = async () => {
    await keeper.shutdown();
    await sleep(50);
    keeper.transactionQueue.status$.subscribe((status) => {
      if (status === 3) {
        process.exit();
      }
    });

    await sleep(2 * 60 * 1000);
    process.exit();
  };

  process.on("SIGTERM", () => {
    gracefulShutdown();
  });
  process.on("SIGINT", () => {
    gracefulShutdown();
  });
};

main();
