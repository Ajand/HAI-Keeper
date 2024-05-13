// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {ICollateralJoin} from '../utils/ICollateralJoin.sol';

import {IFactoryChild} from './IFactoryChild.sol';

interface ICollateralJoinChild is ICollateralJoin, IFactoryChild {}
