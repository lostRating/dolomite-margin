/*

    Copyright 2023 Dolomite.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.

*/

pragma solidity ^0.5.7;
pragma experimental ABIEncoderV2;

import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IDolomiteMargin } from "../../protocol/interfaces/IDolomiteMargin.sol";

import { Account } from "../../protocol/lib/Account.sol";
import { Actions } from "../../protocol/lib/Actions.sol";
import { Events } from "../../protocol/lib/Events.sol";
import { ExcessivelySafeCall } from "../../protocol/lib/ExcessivelySafeCall.sol";
import { Require } from "../../protocol/lib/Require.sol";

import { OnlyDolomiteMargin } from "../helpers/OnlyDolomiteMargin.sol";

import { IExpiry } from "../interfaces/IExpiry.sol";
import { IGenericTraderProxyBase } from "../interfaces/IGenericTraderProxyBase.sol";
import { IIsolationModeToken } from "../interfaces/IIsolationModeToken.sol";
import { ILiquidatorAssetRegistry } from "../interfaces/ILiquidatorAssetRegistry.sol";
import { ILiquidityTokenUnwrapperTrader } from "../interfaces/ILiquidityTokenUnwrapperTrader.sol";
import { ILiquidityTokenWrapperTrader } from "../interfaces/ILiquidityTokenWrapperTrader.sol";
import { IMarginPositionRegistry } from "../interfaces/IMarginPositionRegistry.sol";

import { AccountActionLib } from "../lib/AccountActionLib.sol";


/**
 * @title   GenericTraderProxyBase
 * @author  Dolomite
 *
 * @dev Base contract with validation and utilities for trading any asset from an account
 */
contract GenericTraderProxyBase is IGenericTraderProxyBase {

    // ============ Constants ============

    bytes32 private constant FILE = "GenericTraderProxyBase";

    /// @dev The index of the trade account in the accounts array (for executing an operation)
    uint256 private constant TRADE_ACCOUNT_INDEX = 0;

    // ============ Internal Functions ============

    function _validateMarketIdPath(uint256[] memory _marketIdsPath) internal pure {
        Require.that(
            _marketIdsPath.length >= 2,
            FILE,
            "Invalid market path length"
        );

        Require.that(
            _marketIdsPath[0] != _marketIdsPath[_marketIdsPath.length - 1],
            FILE,
            "Duplicate markets in path"
        );
    }

    function _validateAmountWeisPath(
        uint256[] memory _marketIdsPath,
        uint256[] memory _amountWeisPath
    )
        internal
        pure
    {
        Require.that(
            _marketIdsPath.length == _amountWeisPath.length,
            FILE,
            "Invalid amounts path length"
        );

        for (uint256 i = 0; i < _amountWeisPath.length; i++) {
            Require.that(
                _amountWeisPath[i] > 0,
                FILE,
                "Invalid amount at index",
                i
            );
        }
    }

    function _validateTraderParams(
        GenericTraderProxyCache memory _cache,
        uint256[] memory _marketIdsPath,
        TraderParam[] memory _traderParamsPath
    )
        internal
        view
    {
        Require.that(
            _marketIdsPath.length == _traderParamsPath.length + 1,
            FILE,
            "Invalid traders params length"
        );

        for (uint256 i = 0; i < _traderParamsPath.length; i++) {
            _validateTraderParam(
                _cache,
                _marketIdsPath,
                _traderParamsPath[i],
                /* _index = */ i // solium-disable-line indentation
            );
        }
    }

    function _validateTraderParam(
        GenericTraderProxyCache memory _cache,
        uint256[] memory _marketIdsPath,
        TraderParam memory _traderParam,
        uint256 _index
    )
        internal
        view
    {
        Require.that(
            _traderParam.trader != address(0),
            FILE,
            "Invalid trader at index",
            _index
        );

        uint256 marketId = _marketIdsPath[_index];
        uint256 nextMarketId = _marketIdsPath[_index + 1];
        if (_isIsolationModeMarket(_cache, marketId)) {
            // If the current market is in isolation mode, the trader type must be for isolation mode assets
            Require.that(
                _traderParam.traderType == TraderType.IsolationModeUnwrapper,
                FILE,
                "Invalid isolation mode unwrapper",
                marketId,
                uint8(_traderParam.traderType)
            );
            // The user cannot unwrap into an isolation mode asset
            Require.that(
                !_isIsolationModeMarket(_cache, nextMarketId),
                FILE,
                "Can't unwrap into isolation mode",
                marketId,
                nextMarketId
            );
        } else if (_isIsolationModeMarket(_cache, nextMarketId)) {
            // If the next market is in isolation mode, the trader must wrap the current asset into the isolation asset.
            Require.that(
                _traderParam.traderType == TraderType.IsolationModeWrapper,
                FILE,
                "Invalid isolation mode wrapper",
                nextMarketId,
                uint8(_traderParam.traderType)
            );
        } else {
            // If neither asset is in isolation mode, the trader type must be for non-isolation mode assets
            Require.that(
                _traderParam.traderType == TraderType.ExternalLiquidity
                    || _traderParam.traderType == TraderType.InternalLiquidity,
                FILE,
                "Invalid trader type",
                uint8(_traderParam.traderType)
            );
        }

        if (TraderType.IsolationModeUnwrapper == _traderParam.traderType) {
            ILiquidityTokenUnwrapperTrader unwrapperTrader = ILiquidityTokenUnwrapperTrader(_traderParam.trader);
            address isolationModeToken = _cache.dolomiteMargin.getMarketTokenAddress(marketId);
            Require.that(
                unwrapperTrader.token() == isolationModeToken,
                FILE,
                "Invalid input for unwrapper",
                _index,
                marketId
            );
            Require.that(
                unwrapperTrader.isValidOutputToken(_cache.dolomiteMargin.getMarketTokenAddress(nextMarketId)),
                FILE,
                "Invalid output for unwrapper",
                _index + 1,
                nextMarketId
            );
            Require.that(
                IIsolationModeToken(isolationModeToken).isTokenConverterTrusted(_traderParam.trader),
                FILE,
                "Unwrapper trader not enabled",
                _traderParam.trader,
                marketId
            );
        } else if (TraderType.IsolationModeWrapper == _traderParam.traderType) {
            ILiquidityTokenWrapperTrader wrapperTrader = ILiquidityTokenWrapperTrader(_traderParam.trader);
            address isolationModeToken = _cache.dolomiteMargin.getMarketTokenAddress(nextMarketId);
            Require.that(
                wrapperTrader.isValidInputToken(_cache.dolomiteMargin.getMarketTokenAddress(marketId)),
                FILE,
                "Invalid input for wrapper",
                _index,
                marketId
            );
            Require.that(
                wrapperTrader.token() == isolationModeToken,
                FILE,
                "Invalid output for wrapper",
                _index + 1,
                nextMarketId
            );
            Require.that(
                IIsolationModeToken(isolationModeToken).isTokenConverterTrusted(_traderParam.trader),
                FILE,
                "Wrapper trader not enabled",
                _traderParam.trader,
                nextMarketId
            );
        }

        if (TraderType.InternalLiquidity == _traderParam.traderType) {
            // The makerAccountOwner should be set if the traderType is InternalLiquidity
            Require.that(
                _traderParam.makerAccountOwner != address(0),
                FILE,
                "Invalid maker account owner",
                _index
            );
        } else {
            // The makerAccountOwner and makerAccountNumber is not used if the traderType is not InternalLiquidity
            Require.that(
                _traderParam.makerAccountOwner == address(0) && _traderParam.makerAccountNumber == 0,
                FILE,
                "Invalid maker account owner",
                _index
            );
        }
    }

    function _getAccountsLengthForTraderParams(
        GenericTraderProxyCache memory _cache,
        TraderParam[] memory _tradersPath
    )
        internal
        pure
        returns (uint256)
    {
        uint256 accountsLength = 0;
        for (uint256 i = 0; i < _tradersPath.length; i++) {
            if (TraderType.InternalLiquidity == _tradersPath[i].traderType) {
                accountsLength += 1;
            }
        }
        _cache.traderAccountsLength = accountsLength;
        return accountsLength;
    }

    function _getAccounts(
        GenericTraderProxyCache memory _cache,
        TraderParam[] memory _tradersPath,
        address _tradeAccountOwner,
        uint256 _tradeAccountNumber
    )
        internal
        pure
        returns (Account.Info[] memory)
    {
        Account.Info[] memory accounts = new Account.Info[](
            _cache.traderAccountStartIndex + _getAccountsLengthForTraderParams(_cache, _tradersPath)
        );
        accounts[TRADE_ACCOUNT_INDEX] = Account.Info({
            owner: _tradeAccountOwner,
            number: _tradeAccountNumber
        });
        _appendTradersToAccounts(_cache, _tradersPath, accounts);
        return accounts;
    }

    function _appendTradersToAccounts(
        GenericTraderProxyCache memory _cache,
        TraderParam[] memory _tradersPath,
        Account.Info[] memory _accounts
    )
        internal
        pure
    {
        if (_cache.traderAccountsLength == 0) {
            // save computation by not iterating over the traders if there's no trader accounts
            return;
        }

        for (uint256 i = 0; i < _tradersPath.length; i++) {
            if (TraderType.InternalLiquidity == _tradersPath[i].traderType) {
                _accounts[_cache.traderAccountCursor++] = Account.Info({
                    owner: _tradersPath[i].makerAccountOwner,
                    number: _tradersPath[i].makerAccountNumber
                });
            }
        }

        // reset the trader account cursor for the actions iteration later
        _cache.traderAccountCursor = _cache.traderAccountStartIndex;
    }

    function _getActionsLengthForTraderParams(
        TraderParam[] memory _tradersPath
    )
        internal
        pure
        returns (uint256)
    {
        uint256 actionsLength = 0;
        for (uint256 i = 0; i < _tradersPath.length; i++) {
            if (TraderType.IsolationModeUnwrapper == _tradersPath[i].traderType) {
                actionsLength += ILiquidityTokenUnwrapperTrader(_tradersPath[i].trader).actionsLength();
            } else if (TraderType.IsolationModeWrapper == _tradersPath[i].traderType) {
                actionsLength += ILiquidityTokenUnwrapperTrader(_tradersPath[i].trader).actionsLength();
            } else {
                actionsLength += 1;
            }
        }
        return actionsLength;
    }

    function _appendTraderActions(
        Account.Info[] memory _accounts,
        Actions.ActionArgs[] memory _actions,
        GenericTraderProxyCache memory _cache,
        uint256[] memory _marketIdsPath,
        uint256[] memory _amountWeisPath,
        TraderParam[] memory _tradersPath,
        uint256 _traderActionsLength
    )
        internal
        view
    {
        // Panic if the developer didn't reset the trader account cursor
        assert(_cache.traderAccountCursor == _cache.traderAccountStartIndex);

        for (uint256 i = 0; i < _traderActionsLength; i++) {
            if (_tradersPath[i].traderType == TraderType.ExternalLiquidity) {
                _actions[_cache.actionsCursor++] = AccountActionLib.encodeExternalSellAction(
                    TRADE_ACCOUNT_INDEX,
                    _marketIdsPath[i],
                    _marketIdsPath[i + 1],
                    _tradersPath[i].trader,
                    _amountWeisPath[i],
                    _amountWeisPath[i + 1],
                    _tradersPath[i].tradeData
                );
            } else if (_tradersPath[i].traderType == TraderType.InternalLiquidity) {
                _actions[_cache.actionsCursor++] = AccountActionLib.encodeInternalTradeAction(
                    TRADE_ACCOUNT_INDEX,
                    _cache.traderAccountCursor++,
                    _marketIdsPath[i],
                    _marketIdsPath[i + 1],
                    _tradersPath[i].trader,
                    _amountWeisPath[i],
                    _amountWeisPath[i + 1]
                );
            } else if (_tradersPath[i].traderType == TraderType.IsolationModeUnwrapper) {
                ILiquidityTokenUnwrapperTrader unwrapperTrader = ILiquidityTokenUnwrapperTrader(_tradersPath[i].trader);
                Actions.ActionArgs[] memory unwrapperActions = unwrapperTrader.createActionsForUnwrapping(
                    TRADE_ACCOUNT_INDEX,
                    TRADE_ACCOUNT_INDEX,
                    _accounts[TRADE_ACCOUNT_INDEX].owner,
                    _accounts[TRADE_ACCOUNT_INDEX].owner,
                    _marketIdsPath[i + 1],
                    _marketIdsPath[i],
                    _amountWeisPath[i + 1],
                    _amountWeisPath[i]
                );
                for (uint256 j = 0; j < unwrapperActions.length; j++) {
                    _actions[_cache.actionsCursor++] = unwrapperActions[j];
                }
            } else {
                // Panic if the developer messed up the `else` statement here
                assert(_tradersPath[i].traderType == TraderType.IsolationModeWrapper);

                ILiquidityTokenWrapperTrader wrapperTrader = ILiquidityTokenWrapperTrader(_tradersPath[i].trader);
                Actions.ActionArgs[] memory wrapperActions = wrapperTrader.createActionsForWrapping(
                    TRADE_ACCOUNT_INDEX,
                    TRADE_ACCOUNT_INDEX,
                    _accounts[TRADE_ACCOUNT_INDEX].owner,
                    _accounts[TRADE_ACCOUNT_INDEX].owner,
                    _marketIdsPath[i + 1],
                    _marketIdsPath[i],
                    _amountWeisPath[i + 1],
                    _amountWeisPath[i]
                );
                for (uint256 j = 0; j < wrapperActions.length; j++) {
                    _actions[_cache.actionsCursor++] = wrapperActions[j];
                }
            }
        }
    }

    // ============ Private Functions ============

    function _isIsolationModeMarket(
        GenericTraderProxyCache memory _cache,
        uint256 _marketId
    ) private view returns (bool) {
        (bool isSuccess, bytes memory returnData) = ExcessivelySafeCall.safeStaticCall(
            _cache.dolomiteMargin.getMarketTokenAddress(_marketId),
            IIsolationModeToken(address(0)).isIsolationAsset.selector,
            bytes("")
        );
        return isSuccess && abi.decode(returnData, (bool));
    }
}
