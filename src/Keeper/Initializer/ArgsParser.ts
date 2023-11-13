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
  {
    key: "--system",
    type: String,
    default: "hai",
    help: "Name of the system. E.g hai, open-dollar",
  },
  {
    key: "--system",
    type: String,
    default: "hai",
    help: "Name of the system. E.g hai, open-dollar",
  },
  {
    key: "--colatteral-type",
    type: String,
    default: "ETH-A",
    help: "Name of the collateral type for a collateral keeper",
  },
  {
    key: "--bid-only",
    type: Boolean,
    default: false,
    help: "Do not take opportunities to create new auctions",
  },
  {
    key: "--start-auctions-only",
    type: Boolean,
    default: false,
    help: "Do not bid on auctions. This includes flash swaps",
  },
  {
    key: "--start-auctions-only",
    type: Boolean,
    default: false,
    help: "Do not bid on auctions. This includes flash swaps",
  },
  {
    key: "--settle-auctions-for",
    type: (value: string[]) => {
      /* `value` is always `true` */
      return value.reduce((pV: string[], cV: string) => {
        let valueSet = new Set(pV);
        valueSet.add(cV.toLowerCase());
        return [...valueSet];
      }, []);
    },
    default: [],
    help: "List of addresses for which auctions will be settled",
  },
];

const prepareArgsList = (argsList: string[]) =>
  argsList.reduce((pV: any, cV: any, i: number) => {
    const lastValue = pV[pV.length - 1];
    if (!lastValue) {
      return [...pV, cV];
    }
    if (Array.isArray(lastValue)) {
      if (!cV.startsWith("--")) {
        return [...pV.slice(0, -1), [...lastValue, cV]];
      } else {
        return [...pV, cV];
      }
    } else if (!lastValue.startsWith("--") && !cV.startsWith("--")) {
      return [...pV.slice(0, -1), [lastValue, cV]];
    } else {
      return [...pV, cV];
    }
  }, []);

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
