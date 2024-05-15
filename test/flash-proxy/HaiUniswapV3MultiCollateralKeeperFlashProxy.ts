import { expect } from "chai";
import hre from "hardhat";

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

  
});
