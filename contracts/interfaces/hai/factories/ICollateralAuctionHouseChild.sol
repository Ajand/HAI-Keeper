// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {ICollateralAuctionHouse} from '../ICollateralAuctionHouse.sol';

import {IFactoryChild} from './IFactoryChild.sol';

interface ICollateralAuctionHouseChild is ICollateralAuctionHouse, IFactoryChild {}
