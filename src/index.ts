import { ArgsParser } from "./Keeper/Initializer";
import Keeper from "./Keeper";

const main = async () => {
  const args = process.argv.slice(2);

  const parsedArgs = ArgsParser(args);

  const keeper = new Keeper(args);
};

main();
