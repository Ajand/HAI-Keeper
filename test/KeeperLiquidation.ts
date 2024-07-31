import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import "dotenv/config";
import { ethers } from "ethers";
import hre from "hardhat";
import { expect } from "chai";

import { mineBlocks, sleep, changeCollateralPrice } from "./utils";
import { mintHai } from "./fixtures";

import { REQUIRED_ARGS_KEY_VALUE } from "../tests/contexts/args";
import { keyValueArgsToList } from "../tests/helpers";

import {
  resetNetwork,
  getProvider,
  createFixtureWallet,
  gebUtils,
} from "./utils";

import Keeper from "../src/Keeper";
import { Geb } from "@hai-on-op/sdk";

import { Collateral } from "../src/lib";

const ALL_ARGS_KEY_VALUE = {
  ...REQUIRED_ARGS_KEY_VALUE,
};

/*

const desiredError= "0x660f68af"

    Object.entries(geb.contracts).forEach((contract) => {
      try {
        const parsedError = contract[1].interface.parseError(desiredError);
        console.log("parsed error is: ", parsedError);
      } catch (err) {
        console.log(`can't find the error in ${contract[0]}`);
      }
    });

*/

const setWethPrice = async (
  firstPrice: string,
  secondPrice: string,
  geb: Geb,
  collateral: Collateral
) => {
  const targetOracle = "0x2fc0cb2c5065a79bc2db79e4fbd537b7cacf6f36";

  const TestSettableDelayedOracle = await hre.ethers.getContractFactory(
    "TestSettableDelayedOracle"
  );
  const newOracle = await TestSettableDelayedOracle.deploy(
    "0xF808Bb8264459F5e04a9870D4473b36229126943",
    3600
  );
  await newOracle.deployed();

  await hre.network.provider.request({
    method: "hardhat_setCode",
    params: [
      targetOracle,
      await hre.ethers.provider.getCode(newOracle.address),
    ],
  });

  const oracle = newOracle.attach(targetOracle);

  await oracle.setCurrentFeed(firstPrice, true);
  await oracle.setNextFeed(secondPrice, true);

  //await oracle.updateResult();

  await geb.contracts.oracleRelayer.updateCollateralPrice(
    "0x5745544800000000000000000000000000000000000000000000000000000000"
  );

  await collateral.updateInfo();
};

const deploymentParams = {
  weth: "0x4200000000000000000000000000000000000006",
  systemCoin: "0x10398AbC267496E49106B07dd6BE13364D10dC71",
  coinJoin: "0x30Ce72230A47A0967B7e52A1bAE0178DbD7c6eA3",
  liquidationEngine: "0x8Be588895BE9B75F9a9dAee185e0c2ad89891b56",
};

describe("Keeper Liquidation", () => {
  beforeEach(async function () {});
  /*
 it("Should liquidate liquidatable safes", async () => {
    await resetNetwork();

    const provider = getProvider();

    const fixtureWallet = await createFixtureWallet(provider);

    const weth = await hre.ethers.getContractAt("IWETH", deploymentParams.weth);

    const gebUtilsResult = gebUtils(fixtureWallet);

    const { openSafeAndGenerateDebt, geb, getUserHaiBalance, getProxy } =
      gebUtilsResult;
    //

    const collateralAmount = ethers.utils.parseEther("5").toHexString();
    const haiAmount = ethers.utils.parseEther("11000").toHexString();

    //const desiredError= "0x1f441794"
    //
    //Object.entries(geb.contracts).forEach((contract) => {
    //  try {
    //    const parsedError = contract[1].interface.parseError(desiredError);
    //    console.log("parsed error is: ", parsedError);
    //  } catch (err) {
    //    console.log(`can't find the error in ${contract[0]}`);
    //  }
    //});
    //

    const safeAddress = await openSafeAndGenerateDebt(
      collateralAmount,
      haiAmount
    );

    console.log("safe address is: ", safeAddress);

    await mineBlocks(100);
    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER) + 100;

    const keeper = new Keeper(
      keyValueArgsToList({
        ...ALL_ARGS_KEY_VALUE,
        "--network": "mainnet",
        "--from-block": startingBlock.toString(),
      }),
      {
        provider: provider,
      }
    );

    //const desiredError = "0x12f5ddd6"
    //Object.entries(geb.contracts).forEach((contract) => {
    //  try {
    //    const parsedError = contract[1].interface.parseError(desiredError);
    //    console.log("parsed error is: ", parsedError);
    //  } catch (err) {
    //    console.log(`can't find the error in ${contract[0]}`);
    //  }
    //});

    await provider.send("hardhat_setBalance", [
      keeper.signer.address,
      ethers.utils.parseEther("1000000").toHexString(),
    ]);

    const safeHaiAmount = ethers.utils.parseEther("1000").toHexString();

    await sleep(2000);

    const safe1 = await openSafeAndGenerateDebt(collateralAmount, haiAmount);
    await sleep(2000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);

    await mineBlocks(2);
    await sleep(2000);

    const safe2 = await openSafeAndGenerateDebt(
      collateralAmount,
      safeHaiAmount
    );
    await sleep(2000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);

    await mineBlocks(2);
    await sleep(2000);

    const safe3 = await openSafeAndGenerateDebt(collateralAmount, haiAmount);
    await sleep(2000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);

    await mineBlocks(2);
    await sleep(2000);

    // After reducing the collateral price, the almost critical safes should be liquidated

    await setWethPrice(
      "2558252220900000000000",
      "2558252220900000000000",
      geb,
      keeper.collateral
    );


    await sleep(5000);

    expect(keeper.liquidatedSafes.size).to.be.equal(2);
    expect(keeper.liquidatedSafes.has(String(safe1))).to.be.true;
    expect(keeper.liquidatedSafes.has(String(safe2))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe3))).to.be.true;

    const safe4 = await openSafeAndGenerateDebt(
      collateralAmount,
      safeHaiAmount
    );

    await sleep(2000);
    await mineBlocks(2);

    expect(keeper.liquidatedSafes.size).to.be.equal(2);
    expect(keeper.liquidatedSafes.has(String(safe1))).to.be.true;
    expect(keeper.liquidatedSafes.has(String(safe2))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe3))).to.be.true;
    expect(keeper.liquidatedSafes.has(String(safe4))).to.be.false;
  });

  it("Should liquidate and settle safes if flash swap is on", async () => {
    await resetNetwork();

    const provider = getProvider();

    const fixtureWallet = await createFixtureWallet(provider);

    const weth = await hre.ethers.getContractAt("IWETH", deploymentParams.weth);

    const gebUtilsResult = gebUtils(fixtureWallet);

    const { openSafeAndGenerateDebt, geb, getUserHaiBalance, getProxy } =
      gebUtilsResult;
    //

    const collateralAmount = ethers.utils.parseEther("5").toHexString();
    const haiAmount = ethers.utils.parseEther("11000").toHexString();

    const safeAddress = await openSafeAndGenerateDebt(
      collateralAmount,
      haiAmount
    );

    console.log("safe address is: ", safeAddress);

    await mineBlocks(100);
    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER) + 100;

    const keeper = new Keeper(
      keyValueArgsToList({
        ...ALL_ARGS_KEY_VALUE,
        "--network": "mainnet",
        "--from-block": startingBlock.toString(),
        "--flash-swap": true,
      }),
      {
        provider: provider,
      }
    );

    await provider.send("hardhat_setBalance", [
      keeper.signer.address,
      ethers.utils.parseEther("1000000").toHexString(),
    ]);

    const safeHaiAmount = ethers.utils.parseEther("1000").toHexString();

    await sleep(2000);

    const safe1 = await openSafeAndGenerateDebt(collateralAmount, haiAmount);
    await sleep(2000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);

    await mineBlocks(2);
    await sleep(2000);

    const beforeCollateralBalance = await weth.balanceOf(keeper.signer.address);

    await setWethPrice(
      "2558252220900000000000",
      "2558252220900000000000",
      geb,
      keeper.collateral
    );

    await sleep(10000);

    console.log("keeper address is: ", keeper.signer.address);

    const afterCollateralBalance = await weth.balanceOf(keeper.signer.address);

    console.log(beforeCollateralBalance, afterCollateralBalance);

    expect(afterCollateralBalance).to.be.gt(beforeCollateralBalance);
  });*/

  it("Should liquidate and settle safes if flash swap is on (OP)", async () => {
    const [owner] = await hre.ethers.getSigners();

    await resetNetwork();

    const provider = getProvider();

    const fixtureWallet = await createFixtureWallet(provider);

    const gebUtilsResult = gebUtils(fixtureWallet);

    const { openSafeAndGenerateDebt, geb, getUserHaiBalance, getProxy } =
      gebUtilsResult;

    const weth = await hre.ethers.getContractAt("IWETH", deploymentParams.weth);
    const op = await hre.ethers.getContractAt(
      "IERC20",
      "0x4200000000000000000000000000000000000042"
    );

    console.log("Weth Balance:", await weth.balanceOf(owner.address));

    await weth.deposit({
      value: ethers.utils.parseEther("5"),
    });

    console.log("Weth Balance:", await weth.balanceOf(owner.address));
    console.log("OP Balance:", await op.balanceOf(owner.address));

    const wethAddress = "0x4200000000000000000000000000000000000006";
    const opAddress = "0x4200000000000000000000000000000000000042";
    const swapRouterAddress = "0xE592427A0AEce92De3Edee1F18E0157C05861564";

    // ABI fragments
    const erc20Abi = [
      "function approve(address spender, uint256 amount) external returns (bool)",
    ];
    const swapRouterAbi = [
      "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)",
    ];

    // Create contract instances
    //@ts-ignore
    const wethContract = new ethers.Contract(wethAddress, erc20Abi, owner);
    const swapRouterContract = new ethers.Contract(
      swapRouterAddress,
      swapRouterAbi,
      //@ts-ignore
      owner
    );

    // Swap parameters
    const amountIn = ethers.utils.parseEther("5"); // 5 WETH
    const amountOutMinimum = 0; // Set to 0 for this example, but in practice, use a reasonable minimum

    async function swapWETHforOP() {
      try {
        // 1. Approve SwapRouter to spend WETH
        console.log("Approving WETH...");
        const approveTx = await wethContract.approve(
          swapRouterAddress,
          amountIn
        );
        await approveTx.wait();
        console.log("Approval complete");

        // 2. Perform the swap
        console.log("Swapping WETH for OP...");
        const swapParams = {
          tokenIn: wethAddress,
          tokenOut: opAddress,
          fee: 3000, // 0.3% fee tier
          recipient: owner.address,
          deadline: Math.floor(Date.now() / 1000) + 60 * 20, // 20 minutes from now
          amountIn: amountIn,
          amountOutMinimum: amountOutMinimum,
          sqrtPriceLimitX96: 0,
        };

        const swapTx = await swapRouterContract.exactInputSingle(swapParams, {
          gasLimit: 300000, // Adjust as necessary
        });

        const receipt = await swapTx.wait();
        console.log(
          "Swap complete. Transaction hash:",
          receipt.transactionHash
        );
      } catch (error) {
        console.error("Error during swap:", error);
      }
    }

    await swapWETHforOP();

    console.log(
      "OP Balance:",
      ethers.utils.formatEther(await op.balanceOf(owner.address))
    );

    await op.transfer(fixtureWallet.address, await op.balanceOf(owner.address));

    const proxy = await getProxy();

    const collateralAmount = await op.balanceOf(fixtureWallet.address);

    await op
      .connect(fixtureWallet)
      .approve(proxy.proxyAddress, ethers.constants.MaxUint256);

    const haiAmount = ethers.utils.parseEther("8050");

    console.log("proxy address: ", proxy.proxyAddress);

    let safeAddress;
    try {
      const pop = await proxy.openLockTokenCollateralAndGenerateDebt(
        "OP",
        collateralAmount,
        haiAmount
      );

      const tx = await fixtureWallet.sendTransaction({ ...pop });
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

      receipt.logs.forEach((log) => {
        try {
          const findedLog = iface.parseLog(log);
          safeAddress = findedLog.args._safe;
        } catch (err) {
          //console.error(err);
        }
      });
    } catch (err) {
      throw new Error(err);
    }

    const targetOracle = "0x519011D32806f324364201C5C98579aEC55D9011";

    const TestSettableDelayedOracle = await hre.ethers.getContractFactory(
      "TestSettableDelayedOracle"
    );
    const newOracle = await TestSettableDelayedOracle.deploy(
      "0xc99537Dc7F657797DFBfDE81df21aEB901e6932D",
      3600
    );
    await newOracle.deployed();

    await hre.network.provider.request({
      method: "hardhat_setCode",
      params: [
        targetOracle,
        await hre.ethers.provider.getCode(newOracle.address),
      ],
    });

    const oracle = newOracle.attach(targetOracle);

    await mineBlocks(100);
    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER) + 100;

    const keeper = new Keeper(
      keyValueArgsToList({
        ...ALL_ARGS_KEY_VALUE,
        "--network": "mainnet",
        "--from-block": String(process.env.FORK_BLOCK_NUMBER),
        "--flash-swap": true,
        "--collateral-type": "OP",
      }),
      {
        provider: provider,
      }
    );

    await owner.sendTransaction({
      to: keeper.signer.address,
      value: ethers.utils.parseEther("1.0"),
    });

    await sleep(10000);

    const beforeCollateralBalance = await op.balanceOf(keeper.signer.address);

    await oracle.setCurrentFeed("1243633750000000000", true);
    await oracle.setNextFeed("1243633750000000000", true);

    await geb.contracts.oracleRelayer.updateCollateralPrice(
      "0x4f50000000000000000000000000000000000000000000000000000000000000"
    );

    const desiredError = "0x660f68af";

    Object.entries(geb.contracts).forEach((contract) => {
      try {
        const parsedError = contract[1].interface.parseError(desiredError);
        console.log("parsed error is: ", parsedError);
      } catch (err) {
        console.log(`can't find the error in ${contract[0]}`);
      }
    });

    await keeper.collateral.updateInfo();

    await sleep(10000);

    const afterCollateralBalance = await op.balanceOf(keeper.signer.address);

    expect(afterCollateralBalance).to.be.gt(beforeCollateralBalance);
  });

  /*it("Should not liquidate safes in bid only mode", async () => {
    const { provider, openSafeAndGenerateDebt, geb, fixtureWallet } =
      await mintHai();

    await mineBlocks(100);
    const startingBlock = Number(process.env.FORK_BLOCK_NUMBER) + 100;

    const keeper = new Keeper(
      keyValueArgsToList({
        ...ALL_ARGS_KEY_VALUE,
        "--from-block": startingBlock.toString(),
        "--bid-only": true,
      }),
      {
        provider: provider,
      }
    );

    await provider.send("hardhat_setBalance", [
      keeper.signer.address,
      ethers.utils.parseEther("1000000").toHexString(),
    ]);

    const collateralAmount = ethers.utils.parseEther("5").toHexString();
    const haiAmount = ethers.utils.parseEther("11000").toHexString();
    const safeHaiAmount = ethers.utils.parseEther("1000").toHexString();

    await sleep(2000);

    const safe1 = await openSafeAndGenerateDebt(collateralAmount, haiAmount);
    await sleep(2000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);

    await mineBlocks(2);
    await sleep(2000);

    const safe2 = await openSafeAndGenerateDebt(
      collateralAmount,
      safeHaiAmount
    );
    await sleep(2000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);

    await mineBlocks(2);
    await sleep(2000);

    const safe3 = await openSafeAndGenerateDebt(collateralAmount, haiAmount);
    await sleep(2000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);

    await mineBlocks(2);
    await sleep(2000);

    // After reducing the collateral price, the almost critical safes should be liquidated
    await setWethPrice(
      "2558252220900000000000",
      "2558252220900000000000",
      geb,
      keeper.collateral
    );

    await sleep(5000);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);
    expect(keeper.liquidatedSafes.has(String(safe1))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe2))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe3))).to.be.false;

    const safe4 = await openSafeAndGenerateDebt(
      collateralAmount,
      safeHaiAmount
    );

    await sleep(2000);
    await mineBlocks(2);

    expect(keeper.liquidatedSafes.size).to.be.equal(0);
    expect(keeper.liquidatedSafes.has(String(safe1))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe2))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe3))).to.be.false;
    expect(keeper.liquidatedSafes.has(String(safe4))).to.be.false;
  }); */
});
