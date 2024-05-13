// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {IAuthorizable} from '../utils/IAuthorizable.sol';

import {IFactoryChild} from './IFactoryChild.sol';

interface IAuthorizableChild is IAuthorizable, IFactoryChild {}
