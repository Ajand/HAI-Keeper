import { ArgsParser } from "../../../src/Keeper/Initializer";
import { ARGS_DEF } from "../../../src/Keeper/Initializer/ArgsParser/ArgsDef";

import { keyValueArgsToList } from "../../helpers";

import {
  REQUIRED_ARGS_KEY_VALUE,
  OPTIONAL_ARGS_KEY_VALUE,
} from "../../contexts/args";

const createTestContext = () => {
  const addKeyValueToList = (
    currentList: string[],
    key: string,
    value: string
  ) => {
    return [...currentList, key, value];
  };

  const ALL_ARGS_KEY_VALUE = {
    ...REQUIRED_ARGS_KEY_VALUE,
    ...OPTIONAL_ARGS_KEY_VALUE,
  };

  const ALL_ARGS_DESIRED_OUTCOME = {
    "--rpc-uri": String(ALL_ARGS_KEY_VALUE["--rpc-uri"]),
    "--rpc-timeout": Number(ALL_ARGS_KEY_VALUE["--rpc-timeout"]),
    "--eth-from": String(ALL_ARGS_KEY_VALUE["--eth-from"]),
    "--eth-key": String(ALL_ARGS_KEY_VALUE["--eth-key"]),
    "--system": String(ALL_ARGS_KEY_VALUE["--system"]),
    "--colatteral-type": String(ALL_ARGS_KEY_VALUE["--colatteral-type"]),
    "--bid-only": Boolean(ALL_ARGS_KEY_VALUE["--bid-only"]),
    "--start-auctions-only": Boolean(
      ALL_ARGS_KEY_VALUE["--start-auctions-only"]
    ),
    "--settle-auctions-for": [
      "0x843B6b0fBC1300316C1294aE29AFd961807a9D29",
      "0x4D9cE39323e83Cd1b2810A97707a3B25474d05D6",
    ].map((address) => address.toLowerCase()),
    "--min-auction": Number(ALL_ARGS_KEY_VALUE["--min-auction"]),
    "--max-auctions": Number(ALL_ARGS_KEY_VALUE["--max-auctions"]),
    "--min-collateral-lot": Number(ALL_ARGS_KEY_VALUE["--min-collateral-lot"]),
    "--bid-check-interval": Number(ALL_ARGS_KEY_VALUE["--bid-check-interval"]),
    "--bid-delay": Number(ALL_ARGS_KEY_VALUE["--bid-delay"]),
    "--block-check-interval": Number(
      ALL_ARGS_KEY_VALUE["--block-check-interval"]
    ),
    "--shard-id": Number(ALL_ARGS_KEY_VALUE["--shard-id"]),
    "--graph-endpoints": String(ALL_ARGS_KEY_VALUE["--graph-endpoints"]),
    "--graph-block-threshold": Number(
      ALL_ARGS_KEY_VALUE["--graph-block-threshold"]
    ),
    "--from-block": Number(ALL_ARGS_KEY_VALUE["--from-block"]),
    "--safe-engine-system-coin-target": Number(
      ALL_ARGS_KEY_VALUE["--safe-engine-system-coin-target"]
    ),
    "--keep-system-coin-in-safe-engine-on-exit": Boolean(
      ALL_ARGS_KEY_VALUE["--keep-system-coin-in-safe-engine-on-exit"]
    ),
    "--keep-collateral-in-safe-engine-on-exit": Boolean(
      ALL_ARGS_KEY_VALUE["--keep-collateral-in-safe-engine-on-exit"]
    ),
    "--return-collateral-interval": Number(
      ALL_ARGS_KEY_VALUE["--return-collateral-interval"]
    ),
    "--swap-collateral": Boolean(ALL_ARGS_KEY_VALUE["--swap-collateral"]),
    "--max-swap-slippage": Number(ALL_ARGS_KEY_VALUE["--max-swap-slippage"]),
    "--flash-swap": Boolean(ALL_ARGS_KEY_VALUE["--flash-swap"]),
  };

  const REQUIRED_ARGS_LIST = keyValueArgsToList(REQUIRED_ARGS_KEY_VALUE);

  const OPTIONAL_ARGS_LIST = keyValueArgsToList(OPTIONAL_ARGS_KEY_VALUE);
  const ALL_ARGS_LIST = keyValueArgsToList(ALL_ARGS_KEY_VALUE);

  return {
    addKeyValueToList,
    REQUIRED_ARGS_KEY_VALUE,
    REQUIRED_ARGS_LIST,
    OPTIONAL_ARGS_KEY_VALUE,
    OPTIONAL_ARGS_LIST,
    ALL_ARGS_KEY_VALUE,
    ALL_ARGS_LIST,
    ALL_ARGS_DESIRED_OUTCOME,
  };
};

describe("ArgsParser", () => {
  const {
    addKeyValueToList,
    REQUIRED_ARGS_KEY_VALUE,
    REQUIRED_ARGS_LIST,
    OPTIONAL_ARGS_KEY_VALUE,
    ALL_ARGS_LIST,
    ALL_ARGS_DESIRED_OUTCOME,
  } = createTestContext();

  it("Should not throw an error if required arguments are in place", () => {
    const argsList = REQUIRED_ARGS_LIST;
    expect(() => ArgsParser(argsList)).not.toThrow();
  });

  describe("Parsing Value", () => {
    // Create a copy of the list of command-line arguments
    let argsList: string[] = [...ALL_ARGS_LIST];

    // Parse the command-line arguments using the ArgsParser function
    const args = ArgsParser(argsList);

    // Iterate over all the desired outcomes from the test context
    // The return of the argument parser should match the expected values
    Object.entries(ALL_ARGS_DESIRED_OUTCOME).forEach((desired) => {
      // Use type assertion to access properties dynamically
      // Expect that the parsed arguments match the desired outcomes
      it(`Should parse key ${desired[0]} as ${desired[1]}`, () => {
        expect(args[desired[0]]).toEqual(desired[1]);
      });
      // @ts-ignore
    });
  });

  describe("Required Arguments", () => {
    // Define a function to add a key-value pair to the argument list
    const fillBlankArgs = (
      key: string // @ts-ignore
    ) => addKeyValueToList(argsList, key, REQUIRED_ARGS_KEY_VALUE[key]);

    // Initialize an empty argument list
    let argsList: string[] = [];

    // Iterate over all required arguments from the test context
    // This test checks for errors when required arguments are missing
    // It adds each required argument one at a time to trigger individual errors
    Object.keys(REQUIRED_ARGS_KEY_VALUE).forEach((requiredKey) => {
      // Expect that running ArgsParser with the missing required argument list throws an error
      it(`Must throw an error if ${requiredKey} is missing`, () => {
        expect(() => ArgsParser(argsList)).toThrow(
          `missing required argument: ${requiredKey}`
        );
        argsList = fillBlankArgs(requiredKey);
      });
    });
  });

  describe("Must provide default optional values if they are not provided", () => {
    // Use the list of required arguments for the test context
    const argsList = REQUIRED_ARGS_LIST;

    // Parse the arguments with the ArgsParser function
    const args = ArgsParser(argsList);

    // Iterate over all optional arguments to ensure they have default values
    Object.keys(OPTIONAL_ARGS_KEY_VALUE).forEach((optionalKey) => {
      // Expect that the parsed value for the optional argument matches its default value
      const defaultValue = ARGS_DEF.find(
        (arg) => arg.key === optionalKey
      )?.default;
      it(`Must return ${defaultValue} as the default value for ${optionalKey} if no value is provided`, () => {
        expect(args[optionalKey]).toBe(defaultValue);
      });
    });
  });
});
