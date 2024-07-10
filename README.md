# HAI Auction Keeper

HAI auction keeper is a software for HAI based defi products. Keepers are meant participate in collateral auctions by directly interacting with HAI contracts deployed to the L2 blockchains. It's highly correlated with RAI auction keeper, but it's in typescript and optimized for HAI based systems.

**The interface of the HAI auction keeper is totally compatible with the interface of the RAI auction keeper, so it can work with Keeper manager with no extra effort.**

> To reduce the scope of the software, currently we're intentionally ignoring the surplus and debt auctions.

## Keeper Responsibilities

1.  Monitoring all safes
2.  Liquidating safes that can be liquidated
3.  Monitoring all active auctions
4.  Participate in auctions

## Keeper Features

1.  Gas price options
2.  Accounting options
3.  Rebalancing
4.  Retrieving SAFEs
5.  Auctions
6.  Flash Swaps
7.  Sharding

## Project Outline

The Keepers get develop in 4 phases.

1.  Being able to liquidate and participate in auction reliably
2.  Adding rebalancing and swapping collateral for system coin
3.  Adding flash swap features
4.  Adding surplus and debt auctions

- [ ] Main Module
  - [x] Initializer
    - [x] Configure Auction Contracts
    - [ ] Setup Gas Strategy
    - [ ] Configure accounts for which we'll settle auctions
    - [x] Parsing Args
    - [x] Configure Provider and Signer
    - [x] Configure Core Contracts
  - [x] Main
    - [ ] Sequencer
    - [x] Lifecycle Handler
  - [x] Startup
    - [ ] Plunge
    - [x] Approvals
    - [ ] Rebalancing
    - [x] Logging important informations
  - [x] Approvals
    - [ ] Flash swap approvals
    - [x] Strategy Approval
    - [x] CoinJoin Approval
  - [ ] Plunge: Cancel the pending transactions
  - [x] Shutdown
    - [x] Exit system coin if needed
    - [x] Exit collateral if needed
    - [ ] Swap collateral for system coin if needed
  - [x] Exit system coin on shut down
  - [ ] Auction handled by this shard
  - [x] Check Safes
    - [x] Check if auction is finished or not
    - [x] If needed settle auction with flash proxy
  - [x] Handle discount bid
  - [ ] Rebalance system coin
  - [x] Check all auctions
    - [x] Check if auction is finished or not
    - [ ] If needed settle auction with flash proxy
  - [x] Check for bids
  - [x] Check Auction
  - [x] Handle discount bid
  - [ ] Rebalance system coin
  - [x] Join system coin
  - [x] Exit collateral
  - [x] handle bid
- [ ] Gas price module
  - [ ] Updatable gas price
  - [ ] Dynamic gas price
- [x] Logic module
  - [x] Auction
  - [x] Auctions
  - [ ] Reservoir
- [x] Safe History
  - [x] get safes
- [ ] Strategy
  - [x] Fixed discount collateral auction stratetgy
  - [ ] Increasing discount collateral auction strategy

HaiUniswapV3MultiCollateralKeeperFlashProxy deployed to: 0x890B58171345e098dA78f94c483b6F3564e9CD8f

HaiUniswapV3MultiHopCollateralKeeperFlashProxy for WSTETH deployed to: 0xb78f8aB20AcB52117D6ef5c9c91C39A8B0cDC3Ab
HaiUniswapV3MultiHopCollateralKeeperFlashProxy for OP deployed to: 0xBe775bb4b344FF04196D109E13ce4060b0d839c2
HaiUniswapV3MultiHopCollateralKeeperFlashProxy for SNX deployed to: 0x442e4B4cd2Fa2ccd1C5E1A25dd1144F683feb569
HaiUniswapV3MultiHopCollateralKeeperFlashProxy for WBTC deployed to: 0x8aa2D91Bb6d5D668641914875B55df1d62c10518
HaiUniswapV3MultiHopCollateralKeeperFlashProxy for TBTC deployed to: 0xb15Dc3142858Dc3cc0577EB6B79CdBd0F7E3DCB9
HaiUniswapV3MultiHopCollateralKeeperFlashProxy for RETH deployed to: 0x0191D85BA390adEA4194e81a0827e1E2dA050532
