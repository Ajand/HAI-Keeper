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
  - [ ] Initializer
    - [ ] Configure Auction Contracts
    - [ ] Setup Gas Strategy
    - [ ] Configure accounts for which we'll settle auctions
    - [x] Parsing Args
    - [ ] Configure Provider and Signer
    - [ ] Configure Core Contracts
  - [ ] Main
    - [ ] Sequencer
    - [ ] Lifecycle Handler
  - [ ] Startup
    - [ ] Plunge
    - [ ] Approvals
    - [ ] Rebalancing
    - [ ] Logging important informations
  - [ ] Approvals
    - [ ] Flash swap approvals
    - [ ] Strategy Approval
    - [ ] CoinJoin Approval
  - [ ] Plunge: Cancel the pending transactions
  - [ ] Shutdown
    - [ ] Exit system coin if needed
    - [ ] Exit collateral if needed
    - [ ] Swap collateral for system coin if needed
  - [ ] Exit system coin on shut down
  - [ ] Auction handled by this shard
  - [ ] Check Safes
    - [ ] Check if auction is finished or not
    - [ ] If needed settle auction with flash proxy
  - [ ] Handle discount bid
  - [ ] Rebalance system coin
  - [ ] Check all auctions
    - [ ] Check if auction is finished or not
    - [ ] If needed settle auction with flash proxy
  - [ ] Check for bids
  - [ ] Check Auction
  - [ ] Handle discount bid
  - [ ] Rebalance system coin
  - [ ] Join system coin
  - [ ] Exit collateral
  - [ ] handle bid
- [ ] Gas price module
  - [ ] Updatable gas price
  - [ ] Dynamic gas price
- [ ] Logic module
  - [ ] Auction
  - [ ] Auctions
  - [ ] Reservoir
- [ ] Safe History
  - [ ] get safes
- [ ] Strategy
  - [ ] Fixed discount collateral auction stratetgy
  - [ ] Increasing discount collateral auction strategy
