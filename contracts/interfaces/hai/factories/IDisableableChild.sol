// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {IDisableable} from '../utils/IDisableable.sol';

import {IFactoryChild} from './IFactoryChild.sol';

interface IDisableableChild is IDisableable, IFactoryChild {}
