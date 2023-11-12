import arg, { Spec } from "arg";

interface Arg {
  key: string;
  type: any;
  required?: boolean;
  default?: any;
  help?: string;
}

export const ARGS_DEF: Arg[] = [
  {
    key: "--rpc-uri",
    type: String,
    required: true,
    help: "JSON-RPC endpoint URI with port",
  },
  {
    key: "--rpc-timeout",
    type: Number,
    default: 60,
    help: "JSON-RPC timeout (in seconds, default: 60)",
  },
  {
    key: "--eth-from",
    type: String,
    required: true,
    help: "Ethereum account from which to send transactions",
  },
  {
    key: "--eth-key",
    type: String,
    required: true,
    help: "Ethereum private key(s) to use (e.g. 'key_file=aaa.json,pass_file=aaa.pass')",
  },
  {
    key: "--type",
    type: String,
    default: "collateral",
    help: "Auction type in which to participate",
  },
];

export const ArgsParser = (argsList: string[]) => {
  const args = arg(
    ARGS_DEF.reduce((pV: Spec, cV: Arg) => {
      const list = { ...pV };
      list[cV.key] = cV.type;
      return list;
    }, {}),
    { permissive: true, argv: argsList }
  );

  ARGS_DEF.forEach((arg) => {
    if (arg.required && !args[arg.key])
      throw new Error(`missing required argument: ${arg.key}`);
    if (arg.default && !args[arg.key]) args[arg.key] = arg.default;
  });

  return args;
};
