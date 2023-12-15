import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import hre, { ethers } from "hardhat";
import { utils as ethersUtils } from "ethers";
import { Geb, utils } from "@hai-on-op/sdk";
import { ChainlinkPriceFeedConfig } from "./ChainLinkManipulator";
import {
  ChainlinkOracleAbi,
  DelayedOracleAbi,
} from "./DelayedOracleManipulator";

import {
  getProvider,
  resetNetwork,
  initializeChainlinkPriceFeed,
  createFixtureWallet,
  gebUtils,
} from "./utils";
import { mintHai } from "./fixtures";

import { REQUIRED_ARGS_KEY_VALUE } from "../tests/contexts/args";
import { keyValueArgsToList } from "../tests/helpers";

import Keeper from "../src/Keeper";

const ALL_ARGS_KEY_VALUE = {
  ...REQUIRED_ARGS_KEY_VALUE,
};

function filterObject(originalObject: Object, propsToExclude: Array<string>) {
  return Object.entries(originalObject).reduce((pV, cV) => {
    const currentObject = { ...pV };
    if (propsToExclude.includes(cV[0])) {
      return currentObject;
    }
    //@ts-ignore
    currentObject[cV[0]] = cV[1];
    return currentObject;
  }, {});
}

describe("Fixture tests", () => {
  async function mintHais() {
    const provider = getProvider();

    resetNetwork();

    const chainLinkPriceFeed = await initializeChainlinkPriceFeed(
      hre,
      provider
    );

    const fixtureWallet = await createFixtureWallet(provider);

    const {
      geb,
      getChainlinkRelayer,
      getWethOracle,
      getProxy,
      getWethAndApprove,
    } = gebUtils(fixtureWallet);

    const wethByteString = geb.tokenList.WETH.bytes32String;

    const delayedWethOracle = await getWethOracle();

    const chainlinkRelayer = await getChainlinkRelayer();

    //console.log("proxy address is: ", proxy.proxyAddress);

    //const weth = geb.contracts.weth;

    //console.log(
    //  `fixture wallet weth balance: `,
    //  await weth.balanceOf(fixtureWallet.address)
    //);

    //console.log(
    //  `fixture wallet weth balance after deposit: `,
    //  await weth.balanceOf(fixtureWallet.address)
    //);

    //console.log(
    //  `proxy allowaance for fixture wallet: `,
    //  await weth.allowance(fixtureWallet.address, proxy.proxyAddress)
    //);

    // await time.increase(1800);

    //
    //console.log(
    //  "delayed oracle price source",
    //  await delayedWethOracle.priceSource()
    //);

    console.log(
      "getNextResultWithValidity: ",
      await delayedWethOracle.getNextResultWithValidity()
    );

    console.log(
      "lastUpdate Time: ",
      await delayedWethOracle.lastUpdateTime(),
      "updateDelay Time: ",
      await delayedWethOracle.updateDelay()
    );

    // updated at -> feed timestamp

    const priceToChange = 999999999999999;

    await chainLinkPriceFeed.initChainlinkPriceFeedConfig("ETH/USD");

    await chainLinkPriceFeed.setPrice("ETH/USD", priceToChange);

    const round: any = await chainLinkPriceFeed.getRound("ETH/USD");

    console.log("round1 is: ", round);

    console.log(
      "chainlinkResultWithValidity: ",
      await chainlinkRelayer.getResultWithValidity()
    );

    await provider.send("evm_increaseTime", [1800]);
    await provider.send("evm_mine", []);

    await delayedWethOracle.updateResult();

    await provider.send("evm_increaseTime", [1800]);
    await provider.send("evm_mine", []);

    const blockTimestamp = (await fixtureWallet.provider.getBlock("latest"))
      .timestamp;

    console.log(Number(round.updatedAt) < Number(blockTimestamp));
    console.log(Number(blockTimestamp) - Number(round.updatedAt));

    console.log(
      "chainlinkResultWithValidity: ",
      await chainlinkRelayer.getResultWithValidity()
    );

    //
    console.log(
      "delayed getResultWithValidity: ",
      await delayedWethOracle.getResultWithValidity()
    );

    console.log(
      "delayed getNextResultWithValidity: ",
      await delayedWethOracle.getNextResultWithValidity()
    );

    console.log(
      "collateral safety price before update: ",
      (
        await geb.contracts.safeEngine._cData(wethByteString)
      )._safetyPrice.toString(),
      "collateral safety price before update: ",
      (
        await geb.contracts.safeEngine._cData(wethByteString)
      )._safetyPrice.toString()
    );

    console.log("oracleRelayer address: ", geb.contracts.oracleRelayer.address);

    await geb.contracts.oracleRelayer.updateCollateralPrice(wethByteString);

    console.log(
      "block timestamp before setting price: ",
      (await fixtureWallet.provider.getBlock("latest")).timestamp
    );

    await chainLinkPriceFeed.setPrice("ETH/USD", priceToChange + 1000);

    const round2 = await chainLinkPriceFeed.getRound("ETH/USD");

    const timesinceFeed =
      (await fixtureWallet.provider.getBlock("latest")).timestamp -
      round2.updatedAt;

    console.log("round2: ", round2, "time since feed: ", timesinceFeed);

    await provider.send("evm_increaseTime", [2000]);
    await provider.send("evm_mine", []);

    console.log(
      "chainlinkResultWithValidity: ",
      await chainlinkRelayer.getResultWithValidity()
    );

    console.log(
      "delayed lastUpdateTime: ",
      await delayedWethOracle.lastUpdateTime(),
      "delayed updateDelay: ",
      await delayedWethOracle.updateDelay(),
      "Total: ",
      (await delayedWethOracle.lastUpdateTime()).add(
        await delayedWethOracle.updateDelay()
      ),
      "Block timestamp",
      (await fixtureWallet.provider.getBlock("latest")).timestamp,
      "should update: ",
      await delayedWethOracle.shouldUpdate()
    );

    await delayedWethOracle.updateResult();

    console.log(
      "delayed lastUpdateTime: ",
      await delayedWethOracle.lastUpdateTime()
    );

    console.log(
      "delayed getResultWithValidity: ",
      await delayedWethOracle.getResultWithValidity()
    );

    console.log(
      "delayed getNextResultWithValidity: ",
      await delayedWethOracle.getNextResultWithValidity()
    );

    await geb.contracts.oracleRelayer.updateCollateralPrice(wethByteString);

    console.log(
      "collateral safety price after update: ",
      (
        await geb.contracts.safeEngine._cData(wethByteString)
      )._safetyPrice.toString(),
      "collateral safety price after update: ",
      (
        await geb.contracts.safeEngine._cData(wethByteString)
      )._safetyPrice.toString()
    );

    console.log("oracleRelayer address: ", geb.contracts.oracleRelayer.address);

    /*console.log(
      "chainlinkResultWithValidity: ",
      await chainlinkRelayer.getResultWithValidity()
    );

    await provider.send("evm_increaseTime", [1800]);
    await provider.send("evm_mine", []);


    await provider.send("evm_increaseTime", [1800]);
    await provider.send("evm_mine", []);

    await geb.contracts.oracleRelayer.updateCollateralPrice(wethByteString);
*/

    console.log(
      "collateral safety price: ",
      (
        await geb.contracts.safeEngine._cData(wethByteString)
      )._safetyPrice.toString(),
      "collateral safety price: ",
      (
        await geb.contracts.safeEngine._cData(wethByteString)
      )._safetyPrice.toString()
    );

    try {
      //const openLockTxObj = await proxy.openLockTokenCollateralAndGenerateDebt(
      //
      //);
      //const receipt = await openLockTx.wait();
      ////console.log(geb.tokenList);
      //
      //console.log(openSafePop);
      //console.log(await provider.getCode(proxy.proxyAddress));
      //const openSafeTx = await fixtureWallet.sendTransaction(openSafePop);
      //const receipt = await openSafeTx.wait();
      //console.log(receipt);
    } catch (err) {
      console.error(err);
    }

    return {};
  }

  async function increaseBlockTime() {
    const network = hre.network;

    console.log(network);

    const provider = new ethers.providers.JsonRpcProvider(
      "http://localhost:8545"
    );

    const fixtureWallet = ethers.Wallet.createRandom().connect(provider);

    console.log(
      "before increase timestamp: ",
      (await fixtureWallet.provider.getBlock("latest")).timestamp
    );

    await provider.send("evm_increaseTime", [3600]);
    await provider.send("evm_mine", []);

    console.log(
      "after increase timestamp: ",
      (await fixtureWallet.provider.getBlock("latest")).timestamp
    );
  }

  beforeEach(async function () {});

  it("Should mint HAI", async () => {
    /*const { provider, fixtureWallet } = await loadFixture(mintHai);

    const keeper = new Keeper(keyValueArgsToList(ALL_ARGS_KEY_VALUE), {
      provider: provider,
    });

    console.log(await keeper.getSafes());*/
    //await loadFixture(increaseBlockTime);
  });
});
