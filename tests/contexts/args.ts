import "dotenv/config";
import path from "path";

const rpc_uri = process.env.RPC_URI;

export const REQUIRED_ARGS_KEY_VALUE = {
  "--rpc-uri": rpc_uri ? rpc_uri : "www",
  "--eth-from": "0x1E762556B846e89935de26fEed4Cd62A5B851BBB",
  "--eth-key": `key_file=${path.resolve(
    __dirname,
    "walletFiles/test-key.json"
  )},pass_file=${path.resolve(__dirname, "walletFiles/test-pass.pass")}`,
};

export const OPTIONAL_ARGS_KEY_VALUE = {
  "--rpc-timeout": "30",
  "--type": "surplus",
  "--system": "open-dollar",
  "--colatteral-type": "ETH-B",
  "--bid-only": true,
  "--start-auctions-only": true,
  "--settle-auctions-for": [
    "0x843B6b0fBC1300316C1294aE29AFd961807a9D29",
    "0x4D9cE39323e83Cd1b2810A97707a3B25474d05D6",
    "0x4D9cE39323e83Cd1b2810A97707a3B25474d05D6",
  ],
  "--min-auction": "6",
  "--max-auctions": "2000",
  "--min-collateral-lot": "4.5",
  "--bid-check-interval": "15.6",
  "--bid-delay": "14.2",
  "--block-check-interval": "19.2",
  "--shard-id": "5",
  "--graph-endpoints": "https://graph.co",
  "--graph-block-threshold": "86",
  "--from-block": "823",
  "--safe-engine-system-coin-target": "2999",
  "--keep-system-coin-in-safe-engine-on-exit": true,
  "--keep-collateral-in-safe-engine-on-exit": true,
  "--return-collateral-interval": "1000",
  "--swap-collateral": true,
  "--max-swap-slippage": "0.05",
  "--flash-swap": true,
};
