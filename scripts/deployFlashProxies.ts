import { Geb, utils } from "@hai-on-op/sdk";
import hre from "hardhat";
const { ethers } = hre;

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

const CollateralTypes = {
  WETH: "0x5745544800000000000000000000000000000000000000000000000000000000",
  WSTETH: "0x5753544554480000000000000000000000000000000000000000000000000000",
  OP: "0x4f50000000000000000000000000000000000000000000000000000000000000",
  SNX: "0x534e580000000000000000000000000000000000000000000000000000000000",
  WBTC: "0x5742544300000000000000000000000000000000000000000000000000000000",
  TBTC: "0x5442544300000000000000000000000000000000000000000000000000000000",
  RETH: "0x5245544800000000000000000000000000000000000000000000000000000000",
  "LUSD-A":
    "0x4c5553442d410000000000000000000000000000000000000000000000000000",
  LINK: "0x4c494e4b00000000000000000000000000000000000000000000000000000000",
  VELO: "0x56454c4f00000000000000000000000000000000000000000000000000000000",
  APXETH: "0x4150584554480000000000000000000000000000000000000000000000000000",
};

const main = async () => {
  const deployer = (await ethers.getSigners())[0];

  // @ts-ignore
  const geb = new Geb("mainnet", deployer);

  console.log("Signer address is", deployer.address);

  console.log("weth address: ", geb.contracts.weth.address);

  // Deploy HaiUniswapV3MultiCollateralKeeperFlashProxy
  const HaiUniswapV3MultiCollateralKeeperFlashProxy =
    await ethers.getContractFactory(
      "HaiUniswapV3MultiCollateralKeeperFlashProxy"
    );
  const multiCollateralProxy =
    await HaiUniswapV3MultiCollateralKeeperFlashProxy.deploy(
      geb.contracts.weth.address,
      geb.contracts.systemCoin.address,
      geb.contracts.joinCoin.address,
      geb.contracts.liquidationEngine.address
    );
  await multiCollateralProxy.deployed();
  console.log(
    "HaiUniswapV3MultiCollateralKeeperFlashProxy deployed to:",
    multiCollateralProxy.address
  );

  // Deploy HaiUniswapV3MultiHopCollateralKeeperFlashProxy for each collateral type
  const HaiUniswapV3MultiHopCollateralKeeperFlashProxy =
    await ethers.getContractFactory(
      "HaiUniswapV3MultiHopCollateralKeeperFlashProxy"
    );

  for (const [collateral, bytes32] of Object.entries(CollateralTypes)) {
    if (collateral === "APXETH") continue; // Skip APXETH as there's no pool available

    const tokens = geb.tokenList;

    const collateralData = tokens[collateral];
    const uniswapPairAddress = UniswapPools[`WETH/${collateral}`];

    if (!uniswapPairAddress) {
      console.log(`Skipping ${collateral} due to missing Uniswap pool address`);
      continue;
    }

    const multiHopProxy =
      await HaiUniswapV3MultiHopCollateralKeeperFlashProxy.deploy(
        collateralData.collateralAuctionHouse, // auctionHouseAddress
        geb.contracts.weth.address, // WETH address
        geb.contracts.systemCoin.address, // System coin address (HAI)
        UniswapPools["WETH/HAI"], // uniswapPairAddress (HAI/WETH pool)
        uniswapPairAddress, // auxiliaryUniswapPairAddress
        geb.contracts.joinCoin.address, // CoinJoin address
        collateralData.collateralJoin // collateralJoinAddress
      );
    await multiHopProxy.deployed();
    console.log(
      `HaiUniswapV3MultiHopCollateralKeeperFlashProxy for ${collateral} deployed to:`,
      multiHopProxy.address
    );
  }
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
