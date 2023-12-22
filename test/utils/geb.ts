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
      const tx = await geb.contracts.proxyFactory["build(address)"](
        wallet.address
      );
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

  const openSafeAndGenerateDebt = async (
    collateralAmount: string | number,
    haiAmount: string | number
  ) => {
    const proxy = await getProxy();
    await getWethAndApprove(collateralAmount, proxy.proxyAddress);

    try {
      const pop = await proxy.openLockTokenCollateralAndGenerateDebt(
        "WETH",
        collateralAmount,
        haiAmount
      );
      const tx = await wallet.sendTransaction({ ...pop });
      const receipt = await tx.wait();

      let iface = new ethers.utils.Interface([
        `
        event ModifySAFECollateralization(
            bytes32 indexed _cType,
            address indexed _safe,
            address _collateralSource,
            address _debtDestination,
            int256 _deltaCollateral,
            int256 _deltaDebt
        );
        `,
      ]);

      let safeAddress;

      receipt.logs.forEach((log) => {
        try {
          const findedLog = iface.parseLog(log);
          safeAddress = findedLog.args._safe;
        } catch (err) {
          //console.error(err);
        }
      });
      return safeAddress;
    } catch (err) {
      console.error(err);
    }
  };

  const getUserHaiBalance = async () => {
    return geb.contracts.systemCoin.balanceOf(wallet.address);
  };

  return {
    geb,
    getWethOracle,
    getChainlinkRelayer,
    getProxy,
    getWethAndApprove,
    openSafeAndGenerateDebt,
    getUserHaiBalance,
  };
};
