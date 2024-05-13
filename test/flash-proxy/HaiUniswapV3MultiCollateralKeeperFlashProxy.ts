import { expect } from "chai";
import hre from "hardhat";

const haiEthPair1PercentPool = "0x146b020399769339509c98B7B353d19130C150EC";

// Flash Proxy Deployment

//

describe("Uniswap V3 Multicollateral Flash Swap Proxy", () => {
  async function deploy() {
    const FlashProxy = await hre.ethers.getContractFactory(
      "HaiUniswapV3MultiCollateralKeeperFlashProxy"
    );
    const flashSwap = await FlashProxy.deploy();

    return { flashSwap };
  }

  it("Should be able to deploy flash swap proxy", async () => {
    const { flashSwap } = await deploy();
  });
});
