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
import { Require } from "../../protocol/lib/Require.sol";

import { OnlyDolomiteMargin } from "../helpers/OnlyDolomiteMargin.sol";

import { IExpiry } from "../interfaces/IExpiry.sol";
import { IGenericTraderProxyV1 } from "../interfaces/IGenericTraderProxyV1.sol";
import { ILiquidityTokenUnwrapperTrader } from "../interfaces/ILiquidityTokenUnwrapperTrader.sol";
import { ILiquidityTokenWrapperTrader } from "../interfaces/ILiquidityTokenWrapperTrader.sol";
import { IMarginPositionRegistry } from "../interfaces/IMarginPositionRegistry.sol";

import { AccountActionLib } from "../lib/AccountActionLib.sol";


/**
 * @title   GenericTraderProxyV1
 * @author  Dolomite
 *
 * @dev Proxy contract for trading assets from msg.sender
 */
contract GenericTraderProxyV1 is IGenericTraderProxyV1, OnlyDolomiteMargin, ReentrancyGuard {

    // ============ Constants ============

    bytes32 constant FILE = "GenericTraderProxyV1";

    // ============ Storage ============

    IExpiry public EXPIRY;
    IMarginPositionRegistry public MARGIN_POSITION_REGISTRY;

    // ============ Constructor ============

    constructor (
        address _expiry,
        address _marginPositionRegistry,
        address _dolomiteMargin
    )
    public
    OnlyDolomiteMargin(_dolomiteMargin)
    {
        EXPIRY = IExpiry(_expiry);
        MARGIN_POSITION_REGISTRY = IMarginPositionRegistry(_marginPositionRegistry);
    }

    // ============ Public Functions ============

    function swapExactInputForOutput(
        uint256 _tradeAccountNumber,
        uint256[] memory _marketIdPath,
        uint256[] memory _amountWeisPath,
        TraderParams[] memory _tradersPath
    )
        public
        nonReentrant
    {
        GenericTradeProxyCache memory cache = GenericTradeProxyCache({
            dolomiteMargin: DOLOMITE_MARGIN,
            otherAccountNumber: 0,
            traderAccountsLength: 0,
            // traders go right after the trade account
            traderAccountStartIndex: 1,
            actionsCursor: 0,
            traderAccountCursor: 1
        });
        _validateMarketIdPath(_marketIdPath);
        _validateAmountWeisPath(_marketIdPath, _amountWeisPath);
        _validateTraderParams(cache, _marketIdPath, _tradersPath);

        Account.Info[] memory accounts = _getAccounts(cache, _tradersPath, _tradeAccountNumber);

        uint256 traderActionsLength = _getActionsLengthForTraderParams(_tradersPath);
        Actions.ActionArgs[] memory actions = new Actions.ActionArgs[](traderActionsLength);
        _appendTraderActions(
            actions,
            cache,
            _marketIdPath,
            _amountWeisPath,
            _tradersPath,
            traderActionsLength
        );

        cache.dolomiteMargin.operate(accounts, actions);
    }

    function swapExactInputForOutputAndModifyPosition(
        uint256 _tradeAccountNumber,
        uint256[] memory _marketIdPath,
        uint256[] memory _amountWeisPath,
        TraderParams[] memory _tradersPath,
        TransferCollateralParams memory _transferCollateralParams,
        ExpiryParams memory _expiryParams
    )
        public
        nonReentrant
    {
        GenericTradeProxyCache memory cache = GenericTradeProxyCache({
            dolomiteMargin: DOLOMITE_MARGIN,
            otherAccountNumber: _tradeAccountNumber == _transferCollateralParams.toAccountNumber
                ? _transferCollateralParams.fromAccountNumber
                : _transferCollateralParams.toAccountNumber,
            traderAccountsLength: 0,
            // traders go right after the transfer account ("other account")
            traderAccountStartIndex: 2,
            actionsCursor: 0,
            traderAccountCursor: 2
        });
        _validateMarketIdPath(_marketIdPath);
        _validateAmountWeisPath(_marketIdPath, _amountWeisPath);
        _validateTraderParams(cache, _marketIdPath, _tradersPath);
        _validateTransferParams(cache, _transferCollateralParams, _tradeAccountNumber);

        Account.Info[] memory accounts = _getAccounts(cache, _tradersPath, _tradeAccountNumber);
        // the call to _getAccounts leaves accounts[1] blank because it fills in the traders at `traderAccountCursor`
        accounts[1] = Account.Info({
            owner: msg.sender,
            number: cache.otherAccountNumber
        });

        uint256 traderActionsLength = _getActionsLengthForTraderParams(_tradersPath);
        uint256 transferActionsLength = _getActionsLengthForTransferCollateralParams(_transferCollateralParams);
        uint256 expiryActionsLength = _getActionsLengthForExpiryParams(_expiryParams);
        Actions.ActionArgs[] memory actions = new Actions.ActionArgs[](
            traderActionsLength + transferActionsLength + expiryActionsLength
        );
        _appendTraderActions(
            actions,
            cache,
            _marketIdPath,
            _amountWeisPath,
            _tradersPath,
            traderActionsLength
        );
        _appendTransferActions(
            actions,
            cache,
            _transferCollateralParams,
            _tradeAccountNumber,
            transferActionsLength
        );
        _appendExpiryActions(
            actions,
            cache,
            _expiryParams,
            /* _tradeAccount = */ accounts[0] // solium-disable-line indentation
        );

        cache.dolomiteMargin.operate(accounts, actions);
    }

    // ============ Private Functions ============

    function _validateMarketIdPath(uint256[] memory _marketIdPath) private pure {
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
        private
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
        GenericTradeProxyCache memory _cache,
        uint256[] memory _marketIdPath,
        TraderParams[] memory _tradersPath
    )
        private
        view
    {
        Require.that(
            _marketIdPath.length == _tradersPath.length + 1,
            FILE,
            "Invalid traders path length"
        );

        for (uint256 i = 0; i < _tradersPath.length; i++) {
            IDolomiteMargin dolomiteMargin = _cache.dolomiteMargin;
            address trader = _tradersPath[i].trader;
            Require.that(
                trader != address(0),
                FILE,
                "Invalid trader at index",
                i
            );

            uint256 marketId = _marketIdPath[i];
            uint256 nextMarketId = _marketIdPath[i];
            if (TraderType.LiquidityTokenUnwrapper == _tradersPath[i].traderType) {
                ILiquidityTokenUnwrapperTrader unwrapperTrader = ILiquidityTokenUnwrapperTrader(trader);
                Require.that(
                    unwrapperTrader.token() == dolomiteMargin.getMarketTokenAddress(marketId),
                    FILE,
                    "Invalid input for unwrapper",
                    i,
                    marketId
                );
                Require.that(
                    unwrapperTrader.isValidOutputToken(dolomiteMargin.getMarketTokenAddress(nextMarketId)),
                    FILE,
                    "Invalid output for unwrapper",
                    i + 1,
                    nextMarketId
                );
            } else if (TraderType.LiquidityTokenWrapper == _tradersPath[i].traderType) {
                ILiquidityTokenWrapperTrader wrapperTrader = ILiquidityTokenWrapperTrader(trader);
                Require.that(
                    wrapperTrader.isValidInputToken(dolomiteMargin.getMarketTokenAddress(marketId)),
                    FILE,
                    "Invalid input for wrapper",
                    i,
                    marketId
                );
                Require.that(
                    wrapperTrader.token() == dolomiteMargin.getMarketTokenAddress(nextMarketId),
                    FILE,
                    "Invalid output for wrapper",
                    i + 1,
                    nextMarketId
                );
            }
        }
    }

    function _validateTransferParams(
        GenericTradeProxyCache memory _cache,
        TransferCollateralParams memory _transferCollateralParams,
        uint256 _tradeAccountNumber
    )
        private
        pure
    {
        Require.that(
            _transferCollateralParams.transferAmounts.length > 0,
            FILE,
            "Invalid transfer amounts length"
        );
        Require.that(
            _tradeAccountNumber == _transferCollateralParams.fromAccountNumber
                || _tradeAccountNumber == _transferCollateralParams.toAccountNumber,
            FILE,
            "Invalid trade account number"
        );
        _cache.otherAccountNumber = _tradeAccountNumber == _transferCollateralParams.toAccountNumber
            ? _transferCollateralParams.fromAccountNumber
            : _transferCollateralParams.toAccountNumber;

        for (uint256 i = 0; i < _transferCollateralParams.transferAmounts.length; i++) {
            Require.that(
                _transferCollateralParams.transferAmounts[i].amountWei > 0,
                FILE,
                "Invalid transfer amount at index",
                i
            );
        }
    }

    function _getAccountsLengthForTraderParams(
        GenericTradeProxyCache memory _cache,
        TraderParams[] memory _tradersPath
    )
        private
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
        GenericTradeProxyCache memory _cache,
        TraderParams[] memory _tradersPath,
        uint256 _tradeAccountNumber
    )
        private
        view
        returns (Account.Info[] memory)
    {
        Account.Info[] memory accounts = new Account.Info[](
            1 + _getAccountsLengthForTraderParams(_cache, _tradersPath)
        );
        accounts[0] = Account.Info({
            owner: msg.sender,
            number: _tradeAccountNumber
        });
        _appendTradersToAccounts(_cache, _tradersPath, accounts);
        return accounts;
    }

    function _appendTradersToAccounts(
        GenericTradeProxyCache memory _cache,
        TraderParams[] memory _tradersPath,
        Account.Info[] memory _accounts
    )
        private
        pure
    {
        if (_cache.traderAccountsLength == 0) {
            // save computation by not iterating over the traders if there's no trader accounts
            return;
        }

        for (uint256 i = 0; i < _tradersPath.length; i++) {
            if (TraderType.InternalLiquidity == _tradersPath[i].traderType) {
                _accounts[_cache.traderAccountCursor++] = Account.Info({
                    owner: _tradersPath[i].accountOwner,
                    number: _tradersPath[i].accountNumber
                });
            }
        }

        // reset the trader account cursor for the actions iteration
        _cache.traderAccountCursor = _cache.traderAccountStartIndex;
    }

    function _getActionsLengthForTraderParams(
        TraderParams[] memory _tradersPath
    )
        private
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

    function _getActionsLengthForTransferCollateralParams(
        TransferCollateralParams memory _transferCollateralParams
    )
        private
        pure
        returns (uint256)
    {
        return _transferCollateralParams.transferAmounts.length;
    }

    function _getActionsLengthForExpiryParams(
        ExpiryParams memory _expiryParams
    )
        private
        pure
        returns (uint256)
    {
        if (_expiryParams.expiryTimeDelta == 0) {
            return 0;
        } else {
            return 1;
        }
    }

    function _appendTraderActions(
        Actions.ActionArgs[] memory _actions,
        GenericTradeProxyCache memory _cache,
        uint256[] memory _marketIdPath,
        uint256[] memory _amountWeisPath,
        TraderParams[] memory _tradersPath,
        uint256 _traderActionsLength
    )
        private
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

    function _appendTransferActions(
        Actions.ActionArgs[] memory _actions,
        GenericTradeProxyCache memory _cache,
        TransferCollateralParams memory _transferCollateralParams,
        uint256 _traderAccountNumber,
        uint256 _transferActionsLength
    )
        private
        pure
    {
        // the `_traderAccountNumber` is always `accountId=0`
        uint256 fromAccountId = _transferCollateralParams.fromAccountNumber == _traderAccountNumber
            ? 0
            : 1;
        uint256 toAccountId = _transferCollateralParams.fromAccountNumber == _traderAccountNumber
            ? 1
            : 0;
        for (uint256 i = 0; i < _transferActionsLength; i++) {
            _actions[_cache.actionsCursor++] = AccountActionLib.encodeTransferAction(
                fromAccountId,
                toAccountId,
                _transferCollateralParams.transferAmounts[i].marketId,
                _transferCollateralParams.transferAmounts[i].amountWei
            );
        }
    }

    function _appendExpiryActions(
        Actions.ActionArgs[] memory _actions,
        GenericTradeProxyCache memory _cache,
        ExpiryParams memory _expiryParams,
        Account.Info memory _tradeAccount
    )
        private
        view
    {
        if (_expiryParams.expiryTimeDelta == 0) {
            // Don't append it if there's no expiry
            return;
        }

        _actions[_cache.actionsCursor++] = AccountActionLib.encodeExpirationAction(
            _tradeAccount,
            /* _accountId = */ 0, // solium-disable-line indentation
            _expiryParams.marketId,
            address(EXPIRY),
            _expiryParams.expiryTimeDelta
        );
    }
}
