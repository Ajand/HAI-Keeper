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

contract HaiUniswapV3MultiHopCollateralKeeperFlashProxy {
    ICollateralAuctionHouse public auctionHouse;
    ISAFEEngine public safeEngine;

    IWETH public weth;
    IERC20 public systemCoin;
    ICoinJoin public coinJoin;
    ICollateralJoin public collateralJoin;
    ILiquidationEngine public liquidationEngine;

    // Coin pair (i.e: HAI/WETH)
    IUniswapV3Pool public uniswapPair;
    // Pair used to swap non system coin token to ETH, (i.e: XYZ/ETH)
    IUniswapV3Pool public auxiliaryUniPair;

    bytes32 public collateralType;

    uint256 public constant ZERO = 0;
    uint256 public constant ONE = 1;
    uint160 internal constant MIN_SQRT_RATIO = 4295128739;
    uint160 internal constant MAX_SQRT_RATIO =
        1461446703485210103287273052203988822378723970342;

    /// @notice Constructor
    /// @param auctionHouseAddress Address of the auction house
    /// @param wethAddress WETH address
    /// @param systemCoinAddress System coin address
    /// @param uniswapPairAddress Uniswap V3 pair address (i.e: coin/token)
    /// @param auxiliaryUniswapPairAddress Auxiliary Uniswap V3 pair address (i.e: token/ETH)
    /// @param coinJoinAddress CoinJoin address
    /// @param collateralJoinAddress collateralJoin address
    constructor(
        address auctionHouseAddress,
        address wethAddress,
        address systemCoinAddress,
        address uniswapPairAddress,
        address auxiliaryUniswapPairAddress,
        address coinJoinAddress,
        address collateralJoinAddress
    ) {
        if (auctionHouseAddress == address(0)) {
            revert NullAuctionHouse();
        }
        if (wethAddress == address(0)) {
            revert NullWeth();
        }
        if (systemCoinAddress == address(0)) {
            revert NullSystemCoin();
        }
        if (uniswapPairAddress == address(0)) {
            revert NullUniswapPairAddress();
        }
        if (auxiliaryUniswapPairAddress == address(0)) {
            revert NullUniswapPairAddress();
        }
        if (coinJoinAddress == address(0)) {
            revert NullCoinJoin();
        }
        if (collateralJoinAddress == address(0)) {
            revert NullCollateralJoinAddress();
        }

        auctionHouse = ICollateralAuctionHouse(auctionHouseAddress);
        weth = IWETH(wethAddress);
        systemCoin = IERC20(systemCoinAddress);
        uniswapPair = IUniswapV3Pool(uniswapPairAddress);
        auxiliaryUniPair = IUniswapV3Pool(auxiliaryUniswapPairAddress);
        coinJoin = ICoinJoin(coinJoinAddress);
        collateralJoin = ICollateralJoin(collateralJoinAddress);
        collateralType = auctionHouse.collateralType();
        liquidationEngine = auctionHouse.liquidationEngine();
        safeEngine = liquidationEngine.safeEngine();

        safeEngine.approveSAFEModification(address(auctionHouse));
    }

    function wad(uint rad) internal pure returns (uint) {
        return rad / 10 ** 27;
    }

    // --- External Utils ---
    /// @notice Bids in a single auction
    /// @param auctionId Auction Id
    /// @param amount Amount to bid
    function bid(uint auctionId, uint amount) external {
        if (msg.sender != address(this)) {
            revert OnlySelf();
        }
        auctionHouse.buyCollateral(auctionId, amount);
    }

    /// @notice Bids in multiple auctions atomically
    /// @param auctionIds Auction IDs
    /// @param amounts Amounts to bid
    function multipleBid(
        uint[] calldata auctionIds,
        uint[] calldata amounts
    ) external {
        if (msg.sender != address(this)) {
            revert OnlySelf();
        }
        for (uint i = ZERO; i < auctionIds.length; i++) {
            auctionHouse.buyCollateral(auctionIds[i], amounts[i]);
        }
    }

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
        require(
            msg.sender == address(uniswapPair) ||
                msg.sender == address(auxiliaryUniPair),
            "GebUniswapV3MultiHopKeeperFlashProxy/invalid-uniswap-pair"
        );

        uint amountToRepay = _amount0 > int(ZERO)
            ? uint(_amount0)
            : uint(_amount1);
        IUniswapV3Pool pool = IUniswapV3Pool(msg.sender);
        IERC20 tokenToRepay = _amount0 > int(ZERO)
            ? IERC20(pool.token0())
            : IERC20(pool.token1());

        if (msg.sender == address(uniswapPair)) {
            // flashswap
            // join COIN
            uint amount = systemCoin.balanceOf(address(this));
            systemCoin.approve(address(coinJoin), amount);
            coinJoin.join(address(this), amount);

            (uint160 sqrtLimitPrice, bytes memory data) = abi.decode(
                _data,
                (uint160, bytes)
            );

            // bid
            (bool success, ) = address(this).call(data);
            require(success, "failed bidding");

            // exit WETH
            collateralJoin.exit(
                address(this),
                safeEngine.tokenCollateral(collateralType, address(this))
            );

            // swap secondary secondary weth for exact amount of secondary token
            _startSwap(
                auxiliaryUniPair,
                address(tokenToRepay) == auxiliaryUniPair.token1(),
                amountToRepay,
                sqrtLimitPrice,
                ""
            );
        }
        // pay for swap
        tokenToRepay.transfer(msg.sender, amountToRepay);
    }

    // --- Internal Utils ---
    /// @notice Initiates a (flash)swap
    /// @param pool Pool in wich to perform the swap
    /// @param zeroForOne Direction of the swap
    /// @param amount Amount to borrow
    /// @param data Callback data, it will call this contract with the raw data
    function _startSwap(
        IUniswapV3Pool pool,
        bool zeroForOne,
        uint amount,
        uint160 sqrtLimitPrice,
        bytes memory data
    ) internal {
        if (sqrtLimitPrice == 0)
            sqrtLimitPrice = zeroForOne
                ? MIN_SQRT_RATIO + 1
                : MAX_SQRT_RATIO - 1;

        pool.swap(
            address(this),
            zeroForOne,
            int256(amount) * -1,
            sqrtLimitPrice,
            data
        );
    }

    /// @notice Returns all available opportunities from a provided auction list
    /// @param auctionIds Auction IDs
    /// @return ids IDs of active auctions
    /// @return bidAmounts Rad amounts still requested by auctions
    /// @return totalAmount Wad amount to be borrowed
    function _getOpenAuctionsBidSizes(
        uint[] memory auctionIds
    ) internal view returns (uint[] memory, uint[] memory, uint) {
        //uint amountToRaise;
        uint totalAmount;
        uint opportunityCount;

        uint[] memory ids = new uint[](auctionIds.length);
        uint[] memory bidAmounts = new uint[](auctionIds.length);

        for (uint i = ZERO; i < auctionIds.length; i++) {
            (, uint amountToRaise, , , ) = auctionHouse._auctions(
                auctionIds[i]
            );

            if (amountToRaise > ZERO) {
                totalAmount = totalAmount + wad(amountToRaise) + ONE;
                ids[opportunityCount] = auctionIds[i];
                bidAmounts[opportunityCount] = amountToRaise;
                opportunityCount++;
            }
        }

        assembly {
            mstore(ids, opportunityCount)
            mstore(bidAmounts, opportunityCount)
        }

        return (ids, bidAmounts, totalAmount);
    }

    /// @notice Will send the profits back to caller
    function _payCaller() internal {
        IERC20 collateral = collateralJoin.collateral();
        uint profit = collateral.balanceOf(address(this));

        if (address(collateral) == address(weth)) {
            weth.withdraw(profit);
            (bool success, ) = msg.sender.call{value: profit}("");
            require(success, "failed to pay caller");
        } else collateral.transfer(msg.sender, profit);
    }

    // --- Core Bidding and Settling Logic ---
    /// @notice Liquidates an underwater safe and settles the auction right away
    /// @dev It will revert for protected SAFEs (those that have saviours). Protected SAFEs need to be liquidated through the LiquidationEngine
    /// @param safe A SAFE's ID
    /// @param sqrtLimitPrices Limit prices for both swaps (in order)
    /// @return auction The auction ID
    function liquidateAndSettleSAFE(
        address safe,
        uint160[2] memory sqrtLimitPrices
    ) public returns (uint auction) {
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
        settleAuction(auction, sqrtLimitPrices);
    }

    /// @notice Liquidates an underwater safe and settles the auction right away - no slippage control
    /// @dev It will revert for protected SAFEs (those that have saviours). Protected SAFEs need to be liquidated through the LiquidationEngine
    /// @param safe A SAFE's ID
    /// @return auction The auction ID
    function liquidateAndSettleSAFE(
        address safe
    ) public returns (uint auction) {
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
        settleAuction(auction);
    }

    /// @notice Settle auction
    /// @param auctionId ID of the auction to be settled
    /// @param sqrtLimitPrices Limit prices for both swaps (in order)
    function settleAuction(
        uint auctionId,
        uint160[2] memory sqrtLimitPrices
    ) public {
        (, uint amountToRaise, , , ) = auctionHouse._auctions(auctionId);
        if (amountToRaise == 0) {
            revert AlreadySettled();
        }

        bytes memory callbackData = abi.encode(
            sqrtLimitPrices[1],
            abi.encodeWithSelector(this.bid.selector, auctionId, amountToRaise)
        );

        _startSwap(
            uniswapPair,
            address(systemCoin) == uniswapPair.token1(),
            wad(amountToRaise) + ONE,
            sqrtLimitPrices[0],
            callbackData
        );
        _payCaller();
    }

    /// @notice Settle auctions
    /// @param auctionIds IDs of the auctions to be settled
    /// @param sqrtLimitPrices Limit prices for both swaps (in order)
    function settleAuction(
        uint[] memory auctionIds,
        uint160[2] memory sqrtLimitPrices
    ) public {
        (
            uint[] memory ids,
            uint[] memory bidAmounts,
            uint totalAmount
        ) = _getOpenAuctionsBidSizes(auctionIds);

        if (totalAmount == 0) {
            revert AlreadySettled();
        }

        bytes memory callbackData = abi.encode(
            sqrtLimitPrices[1],
            abi.encodeWithSelector(this.multipleBid.selector, ids, bidAmounts)
        );

        _startSwap(
            uniswapPair,
            address(systemCoin) == uniswapPair.token1(),
            totalAmount,
            sqrtLimitPrices[0],
            callbackData
        );
        _payCaller();
    }

    /// @notice Settle auction - no slippage controls for backward compatibility
    /// @param auctionId ID of the auction to be settled
    function settleAuction(uint auctionId) public {
        uint160[2] memory sqrtLimitPrices;
        settleAuction(auctionId, sqrtLimitPrices);
    }

    /// @notice Settle auction - no slippage controls for backward compatibility
    /// @param auctionIds IDs of the auctions to be settled
    function settleAuction(uint[] memory auctionIds) public {
        uint160[2] memory sqrtLimitPrices;
        settleAuction(auctionIds, sqrtLimitPrices);
    }

    error NullAuctionHouse();
    error NullWeth();
    error NullSystemCoin();
    error NullUniswapPairAddress();
    error NullCoinJoin();
    error NullCollateralJoinAddress();

    error SafeIsProtected();
    error AlreadySettled();
    error OnlySelf();

    // --- Fallback ---
    receive() external payable {
        require(
            msg.sender == address(weth),
            "GebUniswapV3MultiHopKeeperFlashProxy/only-weth-withdrawals-allowed"
        );
    }
}
