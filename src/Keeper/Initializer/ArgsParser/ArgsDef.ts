import { Arg } from "../../../types/Initializer";

export const ARGS_DEF: Arg[] = [
  {
    key: "--network",
    type: String,
    default: "optimism-goerli",
    help: "The network which we gonna look for contracts on sdk. ( defaulted to test-network for tests )",
  },
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
    key: "--collateral-type",
    type: String,
    default: "WETH",
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
      return value.reduce((pV: string[], cV: string) => {
        let valueSet = new Set(pV);
        valueSet.add(cV.toLowerCase());
        return [...valueSet];
      }, []);
    },
    default: [],
    help: "List of addresses for which auctions will be settled",
  },
  {
    key: "--min-auction",
    type: Number,
    default: 1,
    help: "Lowest auction id to consider",
  },
  {
    key: "--max-auctions",
    type: Number,
    default: 1000,
    help: "Maximum number of auctions to simultaneously interact with, used to manage OS and hardware limitations",
  },
  {
    key: "--min-collateral-lot",
    type: Number,
    default: 0,
    help: "Minimum lot size to create or bid upon a collateral auction",
  },
  {
    key: "--bid-check-interval",
    type: Number,
    default: 4.0,
    help: "Period of timer [in seconds] used to check bidding models for changes",
  },
  {
    key: "--bid-delay",
    type: Number,
    default: 0.0,
    help: "Seconds to wait between bids, used to manage OS and hardware limitations",
  },
  {
    key: "--block-check-interval",
    type: Number,
    default: 1.0,
    help: "Period of timer [in seconds] used to check for new blocks. If using Infura free-tier, you must increase this value",
  },
  {
    key: "--shard-id",
    type: Number,
    default: 0,
    help: "When sharding auctions across multiple keepers, this identifies the shard",
  },
  {
    key: "--graph-endpoints",
    type: String,
    default: "",
    help:
      "Comma-delimited list of graph endpoints. When specified, safe history will be initialized " +
      "from a Graph node, reducing load on the Ethereum node for collateral auctions. " +
      "If multiple nodes are passed, they will be tried in order",
  },
  {
    key: "--graph-block-threshold",
    type: Number,
    default: 20,
    help:
      "If last block seen is older than this, use the graph for fetching data. Otherwise, use the node. " +
      "This allows the keeper to use the graph when fetching historical data, but use a node for " +
      " recent blocks, which should be updated faster than the graph",
  },
  {
    key: "--from-block",
    type: Number,
    help:
      "Starting block from which to find vaults to liquidation or debt to queue " +
      "(If not configured, this is set to the block where GEB was deployed)",
  },
  {
    key: "--safe-engine-system-coin-target",
    type: (value: string) => {
      if (isNaN(Number(value))) return String(value);
      return Number(value);
    },
    default: "ALL",
    help: "Amount of system coin to keep in the SAFEEngine contract or 'ALL' to join entire token balance",
  },
  {
    key: "--keep-system-coin-in-safe-engine-on-exit",
    type: Boolean,
    default: false,
    help: "Retain system coin in the SAFE Engine on exit, saving gas when restarting the keeper",
  },
  {
    key: "--keep-collateral-in-safe-engine-on-exit",
    type: Boolean,
    default: false,
    help: "Retain collateral in the SAFE Engine on exit",
  },
  {
    key: "--return-collateral-interval",
    type: Number,
    default: 300,
    help: "Period of timer [in seconds] used to check and exit won collateral",
  },
  {
    key: "--swap-collateral",
    type: Boolean,
    default: false,
    help: "After exiting won collateral, swap it on Uniswap for system coin",
  },
  {
    key: "--max-swap-slippage",
    type: Number,
    default: 0.01,
    help: "Maximum amount of slippage allowed when swapping collateral",
  },
  {
    key: "--flash-swap",
    type: Boolean,
    default: false,
    help: "Use uniswap flash swaps to liquidate and settle auctions. No system coin or collateral is needed",
  },
];
