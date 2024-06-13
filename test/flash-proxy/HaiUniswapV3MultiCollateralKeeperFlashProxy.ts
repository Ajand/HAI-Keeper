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
    const FlashProxy = await hre.ethers.getContractFactory(
      "HaiUniswapV3MultiCollateralKeeperFlashProxy"
    );
    const flashSwap = await FlashProxy.deploy(
      deploymentParams.weth,
      deploymentParams.systemCoin,
      deploymentParams.coinJoin,
      deploymentParams.liquidationEngine
    );

    return { flashSwap };
  }

  async function deployAndCreateSafe() {
    const [owner] = await hre.ethers.getSigners();

    const provider = getProvider();
    await resetNetwork();
    const fixtureWallet = await createFixtureWallet(provider);

    const { flashSwap } = await deploy();

    const weth = await hre.ethers.getContractAt("IWETH", deploymentParams.weth);

    const gebUtilsResult = gebUtils(fixtureWallet);

    const { openSafeAndGenerateDebt, geb, getUserHaiBalance, getProxy } =
      gebUtilsResult;
    //

    const collateralAmount = ethers.utils.parseEther("5").toHexString();
    const haiAmount = ethers.utils.parseEther("12000").toHexString();

    const safeAddress = await openSafeAndGenerateDebt(
      collateralAmount,
      haiAmount
    );

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

    return {
      flashSwap,
      safeAddress,
      geb,
      provider,
      oracle,
      owner,
      weth,
    };
  }

  async function deployAndCreateASaviouredSafe() {
    const [owner] = await hre.ethers.getSigners();

    const { ...deployParams } = await deploy();
    //
    const provider = getProvider();
    await resetNetwork();
    const fixtureWallet = await createFixtureWallet(provider);
    //
    const gebUtilsResult = gebUtils(fixtureWallet);
    //
    const { openSafeAndGenerateDebt, geb, getUserHaiBalance, getProxy } =
      gebUtilsResult;
    //

    const collateralAmount = ethers.utils.parseEther("5").toHexString();
    const haiAmount = ethers.utils.parseEther("10000").toHexString();

    const safeAddress = await openSafeAndGenerateDebt(
      collateralAmount,
      haiAmount
    );

    console.log("generated safe is: ", safeAddress);

    const TestSaviour = await hre.ethers.getContractFactory("TestSaviour");
    const testSaviour = await TestSaviour.deploy();

    console.log("test saviour is:", testSaviour.address);

    const authorizedAccount = "0xd68e7D20008a223dD48A6076AAf5EDd4fe80a899";

    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [authorizedAccount],
    });

    const signer = await hre.ethers.getSigner(authorizedAccount);

    await owner.sendTransaction({
      to: authorizedAccount,
      value: ethers.utils.parseEther("1.0"), // Sends exactly 1.0 ether
    });

    await geb.contracts.liquidationEngine
      //@ts-ignore
      .connect(signer)
      .connectSAFESaviour(testSaviour.address);

    //const revertData = "0xa4d3e565";
    //const decodedError =
    //  geb.contracts.liquidationEngine.interface.parseError(revertData);
    //console.log(`Transaction failed: ${decodedError.name}`);

    //await geb.contracts.safeEngine.approveSAFEModification()

    const proxy = await getProxy();

    //await geb.contracts.liquidationEngine.protectSAFE(
    //  "0x5745544800000000000000000000000000000000000000000000000000000000",
    //  safeAddress,
    //  testSaviour.address
    //);

    //console.log(testSaviour);

    return { ...deployParams, ...gebUtilsResult, provider, fixtureWallet, geb };
  }

  describe("Deployment", () => {
    it("Must not be able to set zero address as the params of the constructor", async () => {
      const FlashProxy = await hre.ethers.getContractFactory(
        "HaiUniswapV3MultiCollateralKeeperFlashProxy"
      );
      await expect(
        FlashProxy.deploy(
          AddressZero,
          deploymentParams.systemCoin,
          deploymentParams.coinJoin,
          deploymentParams.liquidationEngine
        )
      ).to.be.revertedWithCustomError(FlashProxy, "NullWeth");
      await expect(
        FlashProxy.deploy(
          deploymentParams.weth,
          AddressZero,
          deploymentParams.coinJoin,
          deploymentParams.liquidationEngine
        )
      ).to.be.revertedWithCustomError(FlashProxy, "NullSystemCoin");

      await expect(
        FlashProxy.deploy(
          deploymentParams.weth,
          deploymentParams.systemCoin,
          AddressZero,
          deploymentParams.liquidationEngine
        )
      ).to.be.revertedWithCustomError(FlashProxy, "NullCoinJoin");

      await expect(
        FlashProxy.deploy(
          deploymentParams.weth,
          deploymentParams.systemCoin,
          deploymentParams.coinJoin,
          AddressZero
        )
      ).to.be.revertedWithCustomError(FlashProxy, "NullLiquidationEngine");
    });

    it("Must be deployed properly with right params", async () => {
      const FlashProxy = await hre.ethers.getContractFactory(
        "HaiUniswapV3MultiCollateralKeeperFlashProxy"
      );

      const flashSwap = await FlashProxy.deploy(
        deploymentParams.weth,
        deploymentParams.systemCoin,
        deploymentParams.coinJoin,
        deploymentParams.liquidationEngine
      );

      expect(await flashSwap.weth()).to.be.equal(deploymentParams.weth);
      expect(await flashSwap.systemCoin()).to.be.equal(
        deploymentParams.systemCoin
      );
      expect(await flashSwap.coinJoin()).to.be.equal(deploymentParams.coinJoin);
      expect(await flashSwap.liquidationEngine()).to.be.equal(
        deploymentParams.liquidationEngine
      );
      expect(await flashSwap.safeEngine()).to.be.equal(SAFEEngine);
    });
  });

  describe("Liquidate and settle safe", async () => {
    it("Must revert if safe has a saviour", async () => {
      // TODO: Let's add saviour safes tests later
      const {} = await deployAndCreateASaviouredSafe();
    });

    it("Must revert if call a non existant collateral join", async () => {
      const { flashSwap, geb, safeAddress } = await deployAndCreateSafe();

      await expect(
        flashSwap.liquidateAndSettleSAFE(safeAddress, safeAddress, safeAddress)
      ).to.be.reverted;
    });

    it("Must revert if call a non liquidatable safe", async () => {
      const { flashSwap, geb, safeAddress, oracle } =
        await deployAndCreateSafe();

      // 0x660f68af // LiqEng_SAFENotUnsafe
      //const revertData = '0x660f68af';
      //const decodedError =
      //  geb.contracts.liquidationEngine.interface.parseError(revertData);
      //console.log(`Transaction failed: ${decodedError.name}`);
      //
      await expect(
        flashSwap.liquidateAndSettleSAFE(
          geb.tokenList.WETH.collateralJoin,
          safeAddress,
          safeAddress
        )
      ).to.be.reverted;
    });
  });

  describe("Settle safe", async () => {
    it("Must be able to liquidate and settle auction if safe is liquidatable", async () => {
      const { flashSwap, geb, safeAddress, oracle, owner, weth } =
        await deployAndCreateSafe();

      await oracle.setCurrentFeed("2958252220900000000000", true);
      await oracle.setNextFeed("2958252220900000000000", true);

      await geb.contracts.oracleRelayer.updateCollateralPrice(
        "0x5745544800000000000000000000000000000000000000000000000000000000"
      );

      const beforeCollateralBalance = await weth.balanceOf(owner.address);

      await flashSwap.liquidateAndSettleSAFE(
        geb.tokenList.WETH.collateralJoin,
        safeAddress,
        UniswapPools["WETH/HAI"]
      );

      const afterCollateralBalance = await weth.balanceOf(owner.address);

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
