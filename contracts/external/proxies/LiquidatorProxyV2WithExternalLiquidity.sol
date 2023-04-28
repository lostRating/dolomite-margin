/*

    Copyright 2022 Dolomite.

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
import { Types } from "../../protocol/lib/Types.sol";

import { OnlyDolomiteMargin } from "../helpers/OnlyDolomiteMargin.sol";
import { LiquidatorProxyBase } from "../helpers/LiquidatorProxyBase.sol";

import { IExpiry } from "../interfaces/IExpiry.sol";

import { AccountActionLib } from "../lib/AccountActionLib.sol";


/**
 * @title LiquidatorProxyV2WithExternalLiquidity
 * @author Dolomite
 *
 * Contract for liquidating other accounts in DolomiteMargin and atomically selling off collateral via an external
 * trader contract
 */
contract LiquidatorProxyV2WithExternalLiquidity is ReentrancyGuard, OnlyDolomiteMargin, LiquidatorProxyBase {

    // ============ Constants ============

    bytes32 private constant FILE = "LiquidatorProxyV2";

    // ============ Storage ============

    IExpiry public EXPIRY_PROXY;

    // ============ Constructor ============

    constructor (
        address _expiryProxy,
        address _dolomiteMargin,
        address _liquidatorAssetRegistry
    )
        public
        OnlyDolomiteMargin(
            _dolomiteMargin
        )
        LiquidatorProxyBase(
            _liquidatorAssetRegistry
        )
    {
        EXPIRY_PROXY = IExpiry(_expiryProxy);
    }

    // ============ Public Functions ============

    /**
     * Liquidate liquidAccount using solidAccount. This contract and the msg.sender to this contract must both be
     * operators for the solidAccount.
     *
     * @param _solidAccount                 The account that will do the liquidating
     * @param _liquidAccount                The account that will be liquidated
     * @param _owedMarket                   The owed market whose borrowed value will be added to `owedWeiToLiquidate`
     * @param _heldMarket                   The held market whose collateral will be recovered to take on the debt of
     *                                      `owedMarket`
     * @param _marketIdsForSellActionsPath  The market IDs to use for selling held market into owed market path
     * @param _amountWeisForSellActionsPath The amounts (in wei) to use for the actions path
     * @param _expiry                       The time at which the position expires, if this liquidation is for closing
     *                                      an expired position. Else, 0.
     * @param _trader                       The address of the trader contract to use for selling the held market
     * @param _traderCallData               The calldata to be passed along to the `_trader`'s IExchangeWrapper.
     */
    function liquidate(
        Account.Info memory _solidAccount,
        Account.Info memory _liquidAccount,
        uint256 _owedMarket,
        uint256 _heldMarket,
        uint256[] memory _marketIdsForSellActionsPath,
        uint256[] memory _amountWeisForSellActionsPath,
        uint256 _expiry,
        address _trader,
        bytes memory _traderCallData
    )
        public
        nonReentrant
        requireIsAssetWhitelistedForLiquidation(_owedMarket)
        requireIsAssetWhitelistedForLiquidation(_heldMarket)
    {
        // put all values that will not change into a single struct
        LiquidatorProxyConstants memory constants;
        constants.dolomiteMargin = DOLOMITE_MARGIN;
        constants.trader = _trader;
        constants.orderData = _traderCallData;

        _checkConstants(
            constants,
            _liquidAccount,
            _owedMarket,
            _heldMarket,
            _expiry
        );
        _checkActionsPath(
            _heldMarket,
            _owedMarket,
            _marketIdsForSellActionsPath,
            _amountWeisForSellActionsPath
        );

        constants.solidAccount = _solidAccount;
        constants.liquidAccount = _liquidAccount;
        constants.liquidMarkets = constants.dolomiteMargin.getAccountMarketsWithBalances(_liquidAccount);
        constants.markets = _getMarketInfos(
            constants.dolomiteMargin,
            constants.dolomiteMargin.getAccountMarketsWithBalances(_solidAccount),
            constants.liquidMarkets
        );
        constants.expiryProxy = _expiry > 0 ? EXPIRY_PROXY: IExpiry(address(0));
        constants.expiry = uint32(_expiry);

        LiquidatorProxyCache memory cache = _initializeCache(
            constants,
            _heldMarket,
            _owedMarket
        );

        // validate the msg.sender and that the liquidAccount can be liquidated
        _checkBasicRequirements(constants, _owedMarket);

        // set the max liquidation amount
        _calculateAndSetMaxLiquidationAmount(cache);

        // set the actual liquidation amount
        _calculateAndSetActualLiquidationAmount(_amountWeisForSellActionsPath, cache);

        Account.Info[] memory accounts = _constructAccountsArray(constants);

        // execute the liquidations
        constants.dolomiteMargin.operate(
            accounts,
            _constructActionsArray(
                constants,
                cache,
                /* _solidAccountId = */ 0, // solium-disable-line indentation
                /* _liquidAccount = */ 1, // solium-disable-line indentation
                _marketIdsForSellActionsPath,
                _amountWeisForSellActionsPath
            )
        );
    }

    // ============ Internal Functions ============

    function _constructAccountsArray(
        LiquidatorProxyConstants memory _constants
    )
        internal
        pure
        returns (Account.Info[] memory)
    {
        Account.Info[] memory accounts = new Account.Info[](2);
        accounts[0] = _constants.solidAccount;
        accounts[1] = _constants.liquidAccount;
        return accounts;
    }

    function _constructActionsArray(
        LiquidatorProxyConstants memory _constants,
        LiquidatorProxyCache memory _cache,
        uint256 _solidAccountId,
        uint256 _liquidAccountId,
        uint256[] memory _marketIdsForSellActionsPath,
        uint256[] memory _amountWeisForSellActionsPath
    )
        internal
        view
        returns (Actions.ActionArgs[] memory)
    {
        Actions.ActionArgs[] memory actions = new Actions.ActionArgs[](2);

        if (_constants.expiry > 0) {
            // First action is a trade for closing the expired account
            // accountId is solidAccount; otherAccountId is liquidAccount
            actions[0] = AccountActionLib.encodeExpiryLiquidateAction(
                _solidAccountId,
                _liquidAccountId,
                _cache.owedMarket,
                _cache.heldMarket,
                address(_constants.expiryProxy),
                _constants.expiry,
                _cache.flipMarketsForExpiration
            );
        } else {
            // First action is a liquidation
            // accountId is solidAccount; otherAccountId is liquidAccount
            actions[0] = AccountActionLib.encodeLiquidateAction(
                _solidAccountId,
                _liquidAccountId,
                _cache.owedMarket,
                _cache.heldMarket,
                _cache.owedWeiToLiquidate
            );
        }

        actions[1] = AccountActionLib.encodeExternalSellAction(
            _solidAccountId,
            _cache.heldMarket,
            _cache.owedMarket,
            _constants.trader,
            _amountWeisForSellActionsPath[0],
            _cache.owedWeiToLiquidate,
            _constants.orderData
        );

        return actions;
    }
}
