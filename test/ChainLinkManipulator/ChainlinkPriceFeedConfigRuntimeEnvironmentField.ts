import { ethers, Contract } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { BigNumber } from "@ethersproject/bignumber";
import ChainlinkDataFeeds from "./chainlink-config/chainlink-data-feeds";
import {
  ChainlinkPriceFeedApiResponse,
  EthereumNetworkType,
} from "./chainlink-config/chainlink-data-types";
import { DeploySetterContract } from "./chainlink-config/contracts";

const SUPPORTED_PRICE_FUNCTIONS = ["ascending", "descending", "volatile"];

interface InputPriceConfig {
  priceDelta: number;
  priceFunction: string;
  initialPrice: number;
}

interface TickerConfig {
  ticker: string;
  proxyAddress: string;
  aggregatorContractAddress: string;
  mockerContract: Contract;
  priceConfig?: InputPriceConfig;
  steps: number;
}

export class ChainlinkPriceFeedConfig {
  currentEthereumNetwork?: "Optimism Goerli";
  chainlinkPriceFeeds?: ChainlinkPriceFeedApiResponse;
  tickerConfigs: Map<string, TickerConfig>;
  provider: ethers.providers.Provider;
  hre: HardhatRuntimeEnvironment;

  constructor(
    hre: HardhatRuntimeEnvironment,
    provider: ethers.providers.Provider
  ) {
    this.hre = hre;
    this.provider = provider;
    this.tickerConfigs = new Map<string, TickerConfig>();
  }

  public async initChainlinkPriceFeedConfig(
    ticker: string,
    network = "Optimism Goerli",
    priceConfig?: InputPriceConfig
  ) {
    if (
      priceConfig &&
      SUPPORTED_PRICE_FUNCTIONS.includes(priceConfig.priceFunction) === false
    ) {
      throw new Error("Invalid price function provided");
    }
    if (this.chainlinkPriceFeeds === undefined) {
      this.chainlinkPriceFeeds = await ChainlinkDataFeeds.getAllPriceFeeds();
    }
    const parsedTicker = this.parseTicker(ticker);
    const proxyAddress = await this.convertTickerToProxyAddress(parsedTicker);
    const mockerContract = await this.deployMockerContract(proxyAddress);
    this.tickerConfigs.set(parsedTicker, {
      ticker: parsedTicker,
      proxyAddress: proxyAddress,
      aggregatorContractAddress: mockerContract.address,
      mockerContract: mockerContract,
      priceConfig: priceConfig,
      steps: 0,
    });
    if (priceConfig) {
      await this.setPrice(ticker, priceConfig.initialPrice);
    }
    return this;
  }

  private parseTicker(ticker: string): string {
    return ticker.replace(/\s+/g, "");
  }

  public getTickerConfig(ticker: string): TickerConfig {
    const config = this.tickerConfigs.get(this.parseTicker(ticker));
    if (config === undefined) {
      throw new Error("Ticket not intialized");
    }
    return config;
  }

  public getMockedChainlinkAggregatorAddressForTicker(ticker: string): string {
    const config = this.tickerConfigs.get(this.parseTicker(ticker));
    if (config === undefined) {
      throw new Error("Ticket not intialized");
    }
    return config.aggregatorContractAddress;
  }

  private async deployMockerContract(proxyAddress: string): Promise<Contract> {
    return await DeploySetterContract(proxyAddress, this.hre, this.provider);
  }

  private async convertTickerToProxyAddress(ticker: string) {
    if (!ticker || ticker.length < 1) {
      throw new Error("Must pass a valid pair ticker...");
    }
    const trimmedTicker = ticker.trim();
    const proxies = await ChainlinkDataFeeds.getOptimismProxiesForNetwork();
    const foundProxy = proxies.find((p: { pair: string; proxy: string }) => {
      const normalizedPair = p.pair.replace(/\s+/g, "");
      return normalizedPair === trimmedTicker;
    });
    if (!foundProxy || foundProxy === undefined) {
      throw new Error(
        `Could not find valid proxy for provided ticker: ${ticker} `
      );
    }
    return foundProxy.proxy;
  }

  public async getPrice(ticker: string): Promise<BigNumber> {
    const config = this.getTickerConfig(ticker);
    const round = await config.mockerContract.latestRoundData();
    return round.answer;
  }

  public async getRound(ticker: string): Promise<any> {
    const config = this.getTickerConfig(ticker);
    const round = await config.mockerContract.latestRoundData();
    return round;
  }

  public async nextPrice(ticker: string): Promise<void> {
    const config = this.getTickerConfig(ticker);
    if (config.priceConfig === undefined) {
      throw new Error("Configuration not provided");
    }

    config.steps++;
    switch (config.priceConfig.priceFunction) {
      case "ascending":
        await this.setPrice(
          ticker,
          config.priceConfig.initialPrice +
            config.steps * config.priceConfig.priceDelta
        );
        break;
      case "descending":
        await this.setPrice(
          ticker,
          config.priceConfig.initialPrice -
            config.steps * config.priceConfig.priceDelta
        );
        break;
      case "volatile":
        await this.setPrice(
          ticker,
          config.priceConfig.initialPrice +
            this.volatileDirection(config) *
              (config.steps * config.priceConfig.priceDelta)
        );
        break;
      default:
        throw new Error(
          `Configuration price funciton invalid: [${config.priceConfig.priceFunction}]`
        );
    }
  }

  private volatileDirection(config: TickerConfig): number {
    return config.steps % 2 ? -1 : 1;
  }

  public async setPrice(ticker: string, price: number | string): Promise<void> {
    const config = this.getTickerConfig(ticker);
    const round = await config.mockerContract.latestRoundData();
    const blockTimestamp = (await this.provider.getBlock("latest")).timestamp;

    await config.mockerContract.setValues(
      round.roundId.add(1),
      price,
      blockTimestamp,
      blockTimestamp,
      round.roundId.add(1)
    );
  }
}
