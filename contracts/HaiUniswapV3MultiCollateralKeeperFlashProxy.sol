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

// import IUniV3Pool
import {IUniswapV3Pool} from "./interfaces/uniswapV3/IUniswapV3Pool.sol";

import {console} from "hardhat/console.sol";

contract HaiUniswapV3MultiCollateralKeeperFlashProxy {
    IWETH public weth;
    IERC20 public systemCoin;
    ICoinJoin public coinJoin;
    ILiquidationEngine public liquidationEngine;
    ISAFEEngine public safeEngine;

    IUniswapV3Pool public uniswapPair;

    bytes32 public collateralType;

    uint256 public constant ZERO = 0;
    uint256 public constant ONE = 1;
    uint160 internal constant MIN_SQRT_RATIO = 4295128739;
    uint160 internal constant MAX_SQRT_RATIO =
        1461446703485210103287273052203988822378723970342;

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

    function wad(uint rad) internal pure returns (uint) {
        return rad / 10 ** 27;
    }

    // --- Internal Utils ---
    /// @notice Initiates a flashwap
    /// @param amount Amount to borrow
    /// @param data Callback data
    function _startSwap(uint amount, bytes memory data) internal {
        bool zeroForOne = address(systemCoin) == uniswapPair.token1()
            ? true
            : false;
        uint160 sqrtLimitPrice = zeroForOne
            ? MIN_SQRT_RATIO + 1
            : MAX_SQRT_RATIO - 1;

        uniswapPair.swap(
            address(this),
            zeroForOne,
            int256(amount) * -1,
            sqrtLimitPrice,
            data
        );
    }

    // --- External Utils ---
    /// @notice Called to `msg.sender` after executing a swap via IUniswapV3Pool#swap.
    /// @dev In the implementation you must pay the pool tokens owed for the swap.
    /// The caller of this method must be checked to be a UniswapV3Pool deployed by the canonical UniswapV3Factory.
    /// amount0Delta and amount1Delta can both be 0 if no tokens were swapped.
    /// @param _amount0 The amount of token0 that was sent (negative) or must be received (positive) by the pool by
    /// the end of the swap. If positive, the callback must send that amount of token0 to the pool.
    /// @param _amount1 The amount of token1 that was sent (negative) or must be received (positive) by the pool by
    /// the end of the swap. If positive, the callback must send that amount of token1 to the pool.
    /// @param _data Any data passed through by the caller via the IUniswapV3PoolActions#swap call
    function uniswapV3SwapCallback(
        int256 _amount0,
        int256 _amount1,
        bytes calldata _data
    ) external {
        if (msg.sender != address(uniswapPair)) {
            revert InvalidUniswapPair();
        }

        (
            address caller,
            ICollateralJoin collateralJoin,
            ICollateralAuctionHouse auctionHouse,
            uint auctionId,
            uint amount
        ) = abi.decode(
                _data,
                (address, ICollateralJoin, ICollateralAuctionHouse, uint, uint)
            );

        // join COIN
        uint wadAmount = wad(amount) + 1;
        systemCoin.approve(address(coinJoin), wadAmount);
        coinJoin.join(address(this), wadAmount);

        // bid
        auctionHouse.buyCollateral(auctionId, amount);

        // exit collateral
        collateralJoin.exit(
            address(this),
            safeEngine.tokenCollateral(
                collateralJoin.collateralType(),
                address(this)
            )
        );

        // repay loan
        uint amountToRepay = _amount0 > int(ZERO)
            ? uint(_amount0)
            : uint(_amount1);
        require(
            amountToRepay <=
                collateralJoin.collateral().balanceOf(address(this)),
            "GebUniswapV3MultiCollateralKeeperFlashProxy/unprofitable"
        );
        collateralJoin.collateral().transfer(
            address(uniswapPair),
            amountToRepay
        );

        collateralJoin.collateral().transfer(
            caller,
            collateralJoin.collateral().balanceOf(address(this))
        );

        uniswapPair = IUniswapV3Pool(address(0x0));
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

    /// @notice Settle an auction
    /// @param collateralJoin Join address for a collateral type
    /// @param auctionId ID of the auction to be settled
    /// @param uniswapPoolAddress Uniswap pool address
    function settleAuction(
        ICollateralJoin collateralJoin,
        uint auctionId,
        address uniswapPoolAddress
    ) public {
        (address collateralAuctionHouseAddress, , ) = liquidationEngine
            ._cParams(collateralJoin.collateralType());
        ICollateralAuctionHouse collateralAuctionHouse = ICollateralAuctionHouse(
                collateralAuctionHouseAddress
            );
        (, uint amountToRaise, , , ) = collateralAuctionHouse._auctions(
            auctionId
        );
        if (amountToRaise == 0) {
            revert AlreadySettled();
        }

        bytes memory callbackData = abi.encode(
            msg.sender,
            address(collateralJoin),
            address(collateralAuctionHouse),
            auctionId,
            amountToRaise
        ); // rad

        uniswapPair = IUniswapV3Pool(uniswapPoolAddress);

        safeEngine.approveSAFEModification(address(collateralAuctionHouse));
        _startSwap(wad(amountToRaise) + ONE, callbackData);
        safeEngine.denySAFEModification(address(collateralAuctionHouse));
    }

    error NullWeth();
    error NullSystemCoin();
    error NullCoinJoin();
    error NullLiquidationEngine();

    error SafeIsProtected();
    error AlreadySettled();
    error InvalidUniswapPair();
}
