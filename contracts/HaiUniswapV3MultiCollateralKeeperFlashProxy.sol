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
    /// @param wethAddress WETH address
    /// @param systemCoinAddress System coin address
    /// @param coinJoinAddress CoinJoin address
    /// @param liquidationEngineAddress Liquidation engine address

 */

contract HaiUniswapV3MultiCollateralKeeperFlashProxy {
    constructor() public {

    }
}
