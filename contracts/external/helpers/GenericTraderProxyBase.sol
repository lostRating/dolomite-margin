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
import { Require } from "../../protocol/lib/Require.sol";

import { OnlyDolomiteMargin } from "../helpers/OnlyDolomiteMargin.sol";

import { IExpiry } from "../interfaces/IExpiry.sol";
import { IGenericTraderProxyBase } from "../interfaces/IGenericTraderProxyBase.sol";
import { ILiquidatorAssetRegistry } from "../interfaces/ILiquidatorAssetRegistry.sol";
import { ILiquidityTokenUnwrapperTrader } from "../interfaces/ILiquidityTokenUnwrapperTrader.sol";
import { ILiquidityTokenWrapperTrader } from "../interfaces/ILiquidityTokenWrapperTrader.sol";
import { IMarginPositionRegistry } from "../interfaces/IMarginPositionRegistry.sol";

import { AccountActionLib } from "../lib/AccountActionLib.sol";

import { HasLiquidatorRegistry } from "./HasLiquidatorRegistry.sol";


/**
 * @title   GenericTraderProxyBase
 * @author  Dolomite
 *
 * @dev Proxy contract for trading assets from msg.sender
 */
contract GenericTraderProxyBase is IGenericTraderProxyBase, HasLiquidatorRegistry {

    // ============ Constants ============

    bytes32 private constant FILE = "GenericTraderProxyBase";

    // ============ Internal Functions ============

    function _validateMarketIdPath(uint256[] memory _marketIdPath) internal pure {
        Require.that(
            _marketIdPath.length >= 2,
            FILE,
            "Invalid market path length"
        );

        Require.that(
            _marketIdPath[0] != _marketIdPath[_marketIdPath.length - 1],
            FILE,
            "Duplicate markets in path"
        );
    }

    function _validateAmountWeisPath(
        uint256[] memory _marketIdPath,
        uint256[] memory _amountWeisPath
    )
        internal
        pure
    {
        Require.that(
            _marketIdPath.length == _amountWeisPath.length,
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
        uint256[] memory _marketIdPath,
        TraderParam[] memory _traderParamsPath
    )
        internal
        view
    {
        Require.that(
            _marketIdPath.length == _traderParamsPath.length + 1,
            FILE,
            "Invalid traders params length"
        );

        for (uint256 i = 0; i < _traderParamsPath.length; i++) {
            _validateTraderParam(
                _cache,
                _marketIdPath,
                _traderParamsPath[i],
                /* _index = */ i // solium-disable-line indentation
            );
        }
    }

    function _validateTraderParam(
        GenericTraderProxyCache memory _cache,
        uint256[] memory _marketIdPath,
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

        uint256 marketId = _marketIdPath[_index];
        uint256 nextMarketId = _marketIdPath[_index];
        if (TraderType.LiquidityTokenUnwrapper == _traderParam.traderType) {
            ILiquidityTokenUnwrapperTrader unwrapperTrader = ILiquidityTokenUnwrapperTrader(_traderParam.trader);
            Require.that(
                unwrapperTrader.token() == _cache.dolomiteMargin.getMarketTokenAddress(marketId),
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
                LIQUIDATOR_ASSET_REGISTRY.isLiquidityTokenUnwrapperForAsset(marketId, _traderParam.trader),
                FILE,
                "Unwrapper trader not whitelisted",
                _traderParam.trader,
                _marketIdPath[_index]
            );
        } else if (TraderType.LiquidityTokenWrapper == _traderParam.traderType) {
            ILiquidityTokenWrapperTrader wrapperTrader = ILiquidityTokenWrapperTrader(_traderParam.trader);
            Require.that(
                wrapperTrader.isValidInputToken(_cache.dolomiteMargin.getMarketTokenAddress(marketId)),
                FILE,
                "Invalid input for wrapper",
                _index,
                marketId
            );
            Require.that(
                wrapperTrader.token() == _cache.dolomiteMargin.getMarketTokenAddress(nextMarketId),
                FILE,
                "Invalid output for wrapper",
                _index + 1,
                nextMarketId
            );

            Require.that(
                LIQUIDATOR_ASSET_REGISTRY.isLiquidityTokenWrapperForAsset(nextMarketId, _traderParam.trader),
                FILE,
                "Wrapper trader not whitelisted",
                _traderParam.trader,
                _marketIdPath[_index]
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
        accounts[0] = Account.Info({
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

        // reset the trader account cursor for the actions iteration
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
            if (TraderType.LiquidityTokenUnwrapper == _tradersPath[i].traderType) {
                actionsLength += ILiquidityTokenUnwrapperTrader(_tradersPath[i].trader).actionsLength();
            } else if (TraderType.LiquidityTokenWrapper == _tradersPath[i].traderType) {
                actionsLength += ILiquidityTokenUnwrapperTrader(_tradersPath[i].trader).actionsLength();
            } else {
                actionsLength += 1;
            }
        }
        return actionsLength;
    }

    function _appendTraderActions(
        Actions.ActionArgs[] memory _actions,
        GenericTraderProxyCache memory _cache,
        uint256[] memory _marketIdPath,
        uint256[] memory _amountWeisPath,
        TraderParam[] memory _tradersPath,
        uint256 _traderActionsLength
    )
        internal
        view
    {
        for (uint256 i = 0; i < _traderActionsLength; i++) {
            if (_tradersPath[i].traderType == TraderType.ExternalLiquidity) {
                _actions[_cache.actionsCursor++] = AccountActionLib.encodeExternalSellAction(
                    /* _fromAccountId = */ 0, // _tradeAccountNumber solium-disable-line indentation
                    _marketIdPath[i],
                    _marketIdPath[i + 1],
                    _tradersPath[i].trader,
                    _amountWeisPath[i],
                    _amountWeisPath[i + 1],
                    _tradersPath[i].tradeData
                );
            } else if (_tradersPath[i].traderType == TraderType.InternalLiquidity) {
                _actions[_cache.actionsCursor++] = AccountActionLib.encodeInternalTradeAction(
                    /* _fromAccountId = */ 0, // _tradeAccountNumber solium-disable-line indentation
                    _cache.traderAccountCursor++,
                    _marketIdPath[i],
                    _marketIdPath[i + 1],
                    _tradersPath[i].trader,
                    _amountWeisPath[i],
                    _amountWeisPath[i + 1]
                );
            } else if (_tradersPath[i].traderType == TraderType.LiquidityTokenUnwrapper) {
                ILiquidityTokenUnwrapperTrader unwrapperTrader = ILiquidityTokenUnwrapperTrader(_tradersPath[i].trader);
                Actions.ActionArgs[] memory unwrapperActions = unwrapperTrader.createActionsForUnwrapping(
                    /* _primaryAccountId = */ 0,
                    /* _otherAccountId = */ 0,
                    /* _primaryAccountOwner = */ msg.sender,
                    /* _otherAccountOwner = */ msg.sender,
                    _marketIdPath[i + 1],
                    _marketIdPath[i],
                    _amountWeisPath[i + 1],
                    _amountWeisPath[i]
                );
                for (uint256 j = 0; j < unwrapperActions.length; j++) {
                    _actions[_cache.actionsCursor++] = unwrapperActions[j];
                }
            } else {
                assert(_tradersPath[i].traderType == TraderType.LiquidityTokenWrapper);
                ILiquidityTokenWrapperTrader wrapperTrader = ILiquidityTokenWrapperTrader(_tradersPath[i].trader);
                Actions.ActionArgs[] memory wrapperActions = wrapperTrader.createActionsForWrapping(
                    /* _primaryAccountId = */ 0,
                    /* _otherAccountId = */ 0,
                    /* _primaryAccountOwner = */ msg.sender,
                    /* _otherAccountOwner = */ msg.sender,
                    _marketIdPath[i + 1],
                    _marketIdPath[i],
                    _amountWeisPath[i + 1],
                    _amountWeisPath[i]
                );
                for (uint256 j = 0; j < wrapperActions.length; j++) {
                    _actions[_cache.actionsCursor++] = wrapperActions[j];
                }
            }
        }
    }
}
