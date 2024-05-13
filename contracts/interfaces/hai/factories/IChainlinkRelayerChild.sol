// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {IChainlinkRelayer} from '../oracles/IChainlinkRelayer.sol';

import {IFactoryChild} from './IFactoryChild.sol';

interface IChainlinkRelayerChild is IChainlinkRelayer, IFactoryChild {}
