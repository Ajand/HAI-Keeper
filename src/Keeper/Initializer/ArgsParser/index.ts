import arg, { Spec } from "arg";

import { ARGS_DEF } from "./ArgsDef";
import { prepareArgsList } from "./helpers";

import { Arg } from "../../../types/Initializer";

export const ArgsParser = (argsList: string[]) => {
  const args = arg(
    ARGS_DEF.reduce((pV: Spec, cV: Arg) => {
      const list = { ...pV };
      list[cV.key] = cV.type;
      return list;
    }, {}),
    { permissive: true, argv: prepareArgsList(argsList) }
  );

  ARGS_DEF.forEach((arg) => {
    if (arg.required && !args[arg.key])
      throw new Error(`missing required argument: ${arg.key}`);
    if (arg.default !== undefined && !args[arg.key])
      args[arg.key] = arg.default;
  });

  return args;
};
