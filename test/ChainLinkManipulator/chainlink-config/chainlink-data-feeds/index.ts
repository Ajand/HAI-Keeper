import axios from "axios";

import type { ChainlinkPriceFeedApiResponse } from "../chainlink-data-types";

import OptimismSepolia from "./optimism-sepolia.json";

const CHAINLINK_DOCS_CONSTANTS = {
  ETHEREUM_ADDRESSES_ENDPOINT:
    "https://cl-docs-addresses.web.app/addresses.json",
  ETHEREUM_NETWORKS: {
    MAINNET: "Ethereum Mainnet",
    KOVAN: "Kovan Testnet",
    RINKEBY: "Rinkeby Testnet",
  },

  PAYLOAD_KEYS: {
    ARBITRUM: "arbitrum-price-feeds",
    ETHEREUM: "ethereum-addresses",
    BSC: "binance-smart-chain-addresses-price",
    FANTOM: "fantom-price-feeds",
    MATIC: "matic-addresses",
    SOLANA: "solana-price-feeds",
  },
};

export = {
  getAllPriceFeeds: async function getAllPriceFeeds() {
    try {
      const priceFeedPayload = await axios.get<any>(
        CHAINLINK_DOCS_CONSTANTS.ETHEREUM_ADDRESSES_ENDPOINT
      );

      const priceFeedData: ChainlinkPriceFeedApiResponse =
        priceFeedPayload.data;
      // @ts-ignore
      return priceFeedData[CHAINLINK_DOCS_CONSTANTS.PAYLOAD_KEYS.ETHEREUM];
    } catch (e) {
      console.log(e);
      throw new Error(`Failed to fetch all price feeds...[${e}]`);
    }
  },
  getEthereumProxiesForNetwork: async function getEthereumProxiesForNetwork(
    network = "Ethereum Mainnet"
  ) {
    try {
      const priceFeedPayload = await axios.get<any>(
        CHAINLINK_DOCS_CONSTANTS.ETHEREUM_ADDRESSES_ENDPOINT
      );
      const priceFeedData = priceFeedPayload.data;
      const etherumPriceFeeds =
        priceFeedData[CHAINLINK_DOCS_CONSTANTS.PAYLOAD_KEYS.ETHEREUM];
      const foundNetwork = etherumPriceFeeds.networks.find(
        (n: any) => n.name === network
      );
      if (foundNetwork === undefined) {
        throw new Error(`Could not find ${network} while searching networks`);
      }
      const proxies = foundNetwork.proxies;
      return proxies;
    } catch (e) {
      throw new Error(`Failed to fetch all price feeds...[${e}]`);
    }
  },
  getOptimismProxiesForNetwork: async function getOptimismPriceFeeds(
    network = "Optimism Sepolia"
  ) {
    try {
      //const priceFeedPayload =  /*await axios.get<any>(
      //"https://cl-docs-addresses.web.app/addresses.json"
      //);*/
      const priceFeedData = OptimismSepolia; //priceFeedPayload.data;

      const optimismPriceFeed = priceFeedData["optimism"];

      const foundNetwork = optimismPriceFeed.networks.find(
        (n: any) => n.name === network
      );
      const proxies = foundNetwork.proxies;

      return proxies;
    } catch (e) {
      throw new Error(`Failed to fetch all price feeds...[${e}]`);
    }
  },
  getArbitrumPriceFeeds: async function getArbitrumPriceFeeds() {},
  getAvalanchePriceFeeds: async function getAvalanchePriceFeeds() {},
  getBSCPriceFeeds: async function getBSCPriceFeeds() {},
  getEthereumPriceFeeds: async function getEthereumPriceFeeds() {},
  getFantomPriceFeeds: async function getFantomPriceFeeds() {},
  getMaticPriceFeeds: async function getMaticPriceFeeds() {},
  getSolanaPriceFeeds: async function getSolanaPriceFeeds() {},
};
