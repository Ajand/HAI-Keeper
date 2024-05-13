// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {IDelayedOracle} from '../oracles/IDelayedOracle.sol';

import {IFactoryChild} from './IFactoryChild.sol';

interface IDelayedOracleChild is IDelayedOracle, IFactoryChild {}
