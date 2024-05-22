// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import {ICollateralAuctionHouse} from "./interfaces/hai/ICollateralAuctionHouse.sol";
import {ISAFEEngine} from "./interfaces/hai/ISAFEEngine.sol";
import {ICollateralJoin} from "./interfaces/hai/utils/ICollateralJoin.sol";
import {ICoinJoin} from "./interfaces/hai/utils/ICoinJoin.sol";
import {ILiquidationEngine} from "./interfaces/hai/ILiquidationEngine.sol";

// import IERC20
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
// import IWETH
import {IWETH} from "./interfaces/IWETH.sol";

/*
    /// @notice Constructor

 */

contract HaiUniswapV3MultiCollateralKeeperFlashProxy {
    IWETH public weth;
    IERC20 public systemCoin;
    ICoinJoin public coinJoin;
    ILiquidationEngine public liquidationEngine;
    ISAFEEngine public safeEngine;

    bytes32 public collateralType;

    uint256 public constant ZERO = 0;
    uint256 public constant ONE = 1;

    /// @param wethAddress WETH address
    /// @param systemCoinAddress System coin address
    /// @param coinJoinAddress CoinJoin address
    /// @param liquidationEngineAddress Liquidation engine address
    constructor(
        address wethAddress,
        address systemCoinAddress,
        address coinJoinAddress,
        address liquidationEngineAddress
    ) {
        if (wethAddress == address(0)) {
            revert NullWeth();
        }
        if (systemCoinAddress == address(0)) {
            revert NullSystemCoin();
        }
        if (coinJoinAddress == address(0)) {
            revert NullCoinJoin();
        }
        if (liquidationEngineAddress == address(0)) {
            revert NullLiquidationEngine();
        }

        weth = IWETH(wethAddress);
        systemCoin = IERC20(systemCoinAddress);
        coinJoin = ICoinJoin(coinJoinAddress);
        liquidationEngine = ILiquidationEngine(liquidationEngineAddress);
        safeEngine = ISAFEEngine(liquidationEngine.safeEngine());
    }

    // --- Core Bidding and Settling Logic ---
    /// @notice Liquidates an underwater SAFE and settles the auction right away
    /// @dev It will revert for protected safes (those that have saviours), these need to be liquidated through the LiquidationEngine
    /// @param collateralJoin Join address for a collateral type
    /// @param safe A SAFE's ID
    /// @param uniswapPoolAddress Uniswap pool address
    /// @return auction Auction ID
    function liquidateAndSettleSAFE(
        ICollateralJoin collateralJoin,
        address safe,
        address uniswapPoolAddress
    ) public returns (uint auction) {
        collateralType = collateralJoin.collateralType();
        if (
            liquidationEngine.safeSaviours(
                liquidationEngine.chosenSAFESaviour(collateralType, safe)
            )
        ) {
            if (
                liquidationEngine.chosenSAFESaviour(collateralType, safe) !=
                address(0)
            ) {
                revert SafeIsProtected();
            }
        }
        
        auction = liquidationEngine.liquidateSAFE(collateralType, safe);
        settleAuction(collateralJoin, auction, uniswapPoolAddress);
    }

    function settleAuction(
        ICollateralJoin collateralJoin,
        uint auctionId,
        address uniswapPoolAddress
    ) public {}

    error NullWeth();
    error NullSystemCoin();
    error NullCoinJoin();
    error NullLiquidationEngine();
    error SafeIsProtected();
}
