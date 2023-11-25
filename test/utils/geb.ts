import { Geb, utils } from "@hai-on-op/sdk";
import { ethers } from "ethers";
import {
  DelayedOracleAbi,
  ChainlinkOracleAbi,
} from "../DelayedOracleManipulator";

export const gebUtils = (wallet: ethers.Wallet) => {
  const geb = new Geb("optimism-goerli", wallet);

  const getWethOracle = async () => {
    const wethByteString = geb.tokenList.WETH.bytes32String;
    const wethOracle = (
      await geb.contracts.oracleRelayer._cParams(wethByteString)
    )._oracle;
    const delayedWethOracle = new ethers.Contract(
      wethOracle,
      DelayedOracleAbi,
      wallet
    );
    return delayedWethOracle;
  };

  const getChainlinkRelayer = async () => {
    const delayedWethOracle = await getWethOracle();
    const chainlinkRelayer = new ethers.Contract(
      await delayedWethOracle.priceSource(),
      ChainlinkOracleAbi,
      wallet
    );
    return chainlinkRelayer;
  };

  const getProxy = async () => {
    try {
      const proxy = await geb.getProxyAction(wallet.address);
      return proxy;
    } catch (err) {
      const tx = await geb.deployProxy();
      await tx.wait();
      const proxy = await geb.getProxyAction(wallet.address);
      return proxy;
    }
  };

  const getWethAndApprove = async (
    amount: number | string,
    approveTo: string
  ) => {
    const weth = geb.contracts.weth;
    await weth.deposit({ value: amount });
    await weth.approve(approveTo, amount);
  };

  return {
    geb,
    getWethOracle,
    getChainlinkRelayer,
    getProxy,
    getWethAndApprove,
  };
};
