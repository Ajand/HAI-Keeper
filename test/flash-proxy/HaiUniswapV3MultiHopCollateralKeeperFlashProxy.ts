import { expect } from "chai";
import hre from "hardhat";
import { ethers } from "ethers";

import {
  resetNetwork,
  getProvider,
  createFixtureWallet,
  gebUtils,
} from "../utils";

const haiEthPair1PercentPool = "0x146b020399769339509c98B7B353d19130C150EC";

// Flash Proxy Deployment

//

const AddressZero = hre.ethers.constants.AddressZero;

const deploymentParams = {
  weth: "0x4200000000000000000000000000000000000006",
  systemCoin: "0x10398AbC267496E49106B07dd6BE13364D10dC71",
  coinJoin: "0x30Ce72230A47A0967B7e52A1bAE0178DbD7c6eA3",
  liquidationEngine: "0x8Be588895BE9B75F9a9dAee185e0c2ad89891b56",
};

const UniswapPools = {
  "WETH/HAI": "0x146b020399769339509c98B7B353d19130C150EC",
  "WETH/WSTETH": "0x04F6C85A1B00F6D9B75f91FD23835974Cc07E65c",
  "WETH/OP": "0xFC1f3296458F9b2a27a0B91dd7681C4020E09D05",
  "WETH/SNX": "0x0392b358CE4547601BEFa962680BedE836606ae2",
  "WETH/WBTC": "0x85C31FFA3706d1cce9d525a00f1C7D4A2911754c",
  "WETH/TBTC": "0xa1507A6D0aa14F61Cf9195EBD10cc15ecf1e40F2", // Should be changed to WBTC -> TBTC
  "WETH/RETH": "0xAEfC1edaeDE6ADaDcdF3bB344577D45A80B19582",
  "WETH/LSUSD-A": "0x1682dCd12f6E291De6874DCb0a89EE50465f43bD",
  "WETH/LINK": "0x19EA026886cbB7A900EcB2458636d72b5CaE223B",
  "WETH/VELO": "0xbCFaC19a0036Ada56496316eE5cf388c2aF2BF58",
  "WETH/APXETH": "", // No Pool Available
};

const SAFEEngine = "0x9Ff826860689483181C5FAc9628fd2F70275A700";

describe("Uniswap V3 Multicollateral Flash Swap Proxy", () => {
  async function deploy() {
    const MultiHopFlashProxy = await hre.ethers.getContractFactory(
      "HaiUniswapV3MultiHopCollateralKeeperFlashProxy"
    );

    const opCollateralAuctionHouse =
      "0x6b5c2deA8b9b13A043DDc25C6581cD6D87a2A881";

    const opCollateralJoin = "0x994fa61F9305Bdd6e5E6bA84015Ee28b109C827A";

    const opMultiHopFlashProxy = await MultiHopFlashProxy.deploy(
      opCollateralAuctionHouse,
      deploymentParams.weth,
      deploymentParams.systemCoin,
      UniswapPools["WETH/HAI"],
      UniswapPools["WETH/OP"],
      deploymentParams.coinJoin,
      opCollateralJoin
    );

    return { opMultiHopFlashProxy };
  }

  async function deployAndCreateSafe() {
    const [owner] = await hre.ethers.getSigners();

    const provider = getProvider();
    await resetNetwork();
    const fixtureWallet = await createFixtureWallet(provider);

    const { opMultiHopFlashProxy } = await deploy();

    const gebUtilsResult = gebUtils(fixtureWallet);

    const { openSafeAndGenerateDebt, geb, getUserHaiBalance, getProxy } =
      gebUtilsResult;

    const opPool = await hre.ethers.getContractAt(
      "IUniswapV3Pool",
      UniswapPools["WETH/OP"]
    );

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

    //const MIN_SQRT_RATIO = ethers.BigNumber.from("4295128739");
    //const MAX_SQRT_RATIO = ethers.BigNumber.from(
    //  "1461446703485210103287273052203988822378723970342"
    //);
    //
    //const zeroForOne = (await opPool.token1()) === op.address ? true : false;
    //
    //const sqrtLimitPrice = zeroForOne
    //  ? MIN_SQRT_RATIO.add(1)
    //  : MAX_SQRT_RATIO.sub(1);
    //
    //console.log(
    //  owner.address,
    //  zeroForOne,
    //  await weth.balanceOf(owner.address),
    //  String(sqrtLimitPrice)
    //);
    //
    //await weth.approve(opPool.address, ethers.constants.MaxUint256);
    //
    //console.log(
    //  "weth allowance",
    //  await weth.allowance(owner.address, opPool.address)
    //);

    // Contract addresses (Optimism mainnet)
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

    // Execute the swap
    await swapWETHforOP();

    //await opPool.swap(
    //  owner.address,
    //  zeroForOne,
    //  await weth.balanceOf(owner.address),
    //  sqrtLimitPrice,
    //  "0x"
    //);

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

    const haiAmount = ethers.utils.parseEther("8700");

    console.log("proxy address: ", proxy.proxyAddress);

    // @ts-ignore
    //const revertData = "0x1f441794";
    //const decodedError =
    //  geb.contracts.safeEngine.interface.parseError(revertData);
    //console.log(`Transaction failed: ${decodedError.name}`);

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

    console.log("safe address: ", safeAddress);

    /* const gebUtilsResult = gebUtils(fixtureWallet);

    const { openSafeAndGenerateDebt, geb, getUserHaiBalance, getProxy } =
      gebUtilsResult;
    //

    const collateralAmount = ethers.utils.parseEther("5").toHexString();
    const haiAmount = ethers.utils.parseEther("12000").toHexString();

    const safeAddress = await openSafeAndGenerateDebt(
      collateralAmount,
      haiAmount
    ); */

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

    return {
      opMultiHopFlashProxy,
      safeAddress,
      geb,
      provider,
      oracle,
      owner,
      weth,
      op,
    };
  }

  describe("Settle safe", async () => {
    it("Must be able to liquidate and settle auction if safe is liquidatable", async () => {
      await deployAndCreateSafe();
      const { opMultiHopFlashProxy, geb, safeAddress, oracle, owner, op } =
        await deployAndCreateSafe();

      console.log(
        ethers.utils.formatEther((await oracle.getCurrentFeed()).value),
        (await oracle.getCurrentFeed()).value
      );

      await oracle.setCurrentFeed("1643633750000000000", true);
      await oracle.setNextFeed("1643633750000000000", true);

      console.log(
        ethers.utils.formatEther((await oracle.getCurrentFeed()).value)
      );
      //
      await geb.contracts.oracleRelayer.updateCollateralPrice(
        "0x4f50000000000000000000000000000000000000000000000000000000000000"
      );
      //
      const beforeCollateralBalance = await op.balanceOf(owner.address);

      //

      //const revertData = "0x560ff900";
      //const decodedError =
      //  opMultiHopFlashProxy.interface.parseError(revertData);
      // geb.contracts.liquidationEngine.interface.parseError(revertData);
      //console.log(`Transaction failed: ${decodedError.name}`);

      await opMultiHopFlashProxy["liquidateAndSettleSAFE(address)"](
        safeAddress
      );
      //
      const afterCollateralBalance = await op.balanceOf(owner.address);
      //

      console.log(ethers.utils.formatEther(afterCollateralBalance));

      expect(afterCollateralBalance).to.be.gt(beforeCollateralBalance);
    });
  });
});

/**
 * 
 * 
 *    const errorCode = "0x4d0b26ae";

    // @ts-ignore
    const revertData = errorCode;
    const decodedError =
      geb.contracts.safeEngine.interface.parseError(revertData);
    console.log(`Transaction failed: ${decodedError.name}`);

 */
