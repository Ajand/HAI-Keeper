import { ArgsParser } from "./Keeper/Initializer";

const main = async () => {
  const args = process.argv.slice(2);

  ArgsParser(args);
};

main();
