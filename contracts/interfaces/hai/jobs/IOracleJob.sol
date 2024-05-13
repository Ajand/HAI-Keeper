// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.20;

import {IOracleRelayer} from '../IOracleRelayer.sol';
import {IDelayedOracle} from '../oracles/IDelayedOracle.sol';
import {IPIDRateSetter} from '../IPIDRateSetter.sol';

import {IJob} from './IJob.sol';

import {IAuthorizable} from '../utils/IAuthorizable.sol';
import {IModifiable} from '../utils/IModifiable.sol';

interface IOracleJob is IAuthorizable, IModifiable, IJob {
  // --- Errors ---

  /// @notice Throws when trying to update an invalid collateral price
  error OracleJob_InvalidPrice();

  // --- Data ---

  /// @notice Whether the update collateral price job should be worked
  function shouldWorkUpdateCollateralPrice() external view returns (bool _shouldWorkUpdateCollateralPrice);
  /// @notice Whether the update rate job should be worked
  function shouldWorkUpdateRate() external view returns (bool _shouldWorkUpdateRate);

  // --- Registry ---

  /// @notice Address of the OracleRelayer contract
  function oracleRelayer() external view returns (IOracleRelayer _oracleRelayer);
  /// @notice Address of the PIDRateSetter contract
  function pidRateSetter() external view returns (IPIDRateSetter _pidRateSetter);

  // --- Job ---

  /**
   * @notice Rewarded method to update a collateral price
   * @param _cType Bytes32 representation of the collateral type
   */
  function workUpdateCollateralPrice(bytes32 _cType) external;

  /// @notice Rewarded method to update the redemption rate
  function workUpdateRate() external;
}
