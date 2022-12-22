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

import { IDolomiteMargin } from "../../protocol/interfaces/IDolomiteMargin.sol";

import { Account } from "../../protocol/lib/Account.sol";
import { Actions } from "../../protocol/lib/Actions.sol";
import { Require } from "../../protocol/lib/Require.sol";
import { Types } from "../../protocol/lib/Types.sol";

import { ILiquidityTokenUnwrapperForLiquidation } from "../interfaces/ILiquidityTokenUnwrapperForLiquidation.sol";
import { AccountActionLib } from "../lib/AccountActionLib.sol";

import { LiquidatorProxyV2WithExternalLiquidity } from "./LiquidatorProxyV2WithExternalLiquidity.sol";


/**
 * @title LiquidatorProxyV4WithExternalLiquidityToken
 * @author Dolomite
 *
 * Contract for liquidating other accounts in DolomiteMargin that use external LP token(s) (ones that are not native to
 * Dolomite) as collateral or debt. All collateral is atomically sold off via Paraswap liquidity aggregation.
 */
contract LiquidatorProxyV4WithExternalLiquidityToken is LiquidatorProxyV2WithExternalLiquidity {

    // ============ Events ============

    event TokenUnwrapperForLiquidationSet(uint256 _marketId, ILiquidityTokenUnwrapperForLiquidation _unwrapper);

    // ============ Constants ============

    bytes32 private constant FILE = "LiquidatorProxyV4";

    // ============ Storage ============

    mapping(uint256 => ILiquidityTokenUnwrapperForLiquidation) public marketIdToTokenUnwrapperForLiquidationMap;

    // ============ Constructor ============

    constructor (
        address _expiryProxy,
        address _paraswapAugustusRouter,
        address _paraswapTransferProxy,
        address _dolomiteMargin
    )
    public
    LiquidatorProxyV2WithExternalLiquidity(
        _expiryProxy,
        _paraswapAugustusRouter,
        _paraswapTransferProxy,
        _dolomiteMargin
    )
    {}

    function setMarketIdToTokenUnwrapperForLiquidationMap(
        uint256 _marketId,
        address _unwrapper
    ) external {
        Require.that(
            msg.sender == DOLOMITE_MARGIN.owner(),
            FILE,
            "Only owner can call",
            msg.sender
        );
        marketIdToTokenUnwrapperForLiquidationMap[_marketId] = ILiquidityTokenUnwrapperForLiquidation(_unwrapper);
        emit TokenUnwrapperForLiquidationSet(_marketId, _unwrapper);
    }

    // ============ Internal Functions ============

    function _constructActionsArray(
        Constants memory _constants,
        LiquidatorProxyCache memory _cache,
        uint256 _solidAccountId,
        uint256 _liquidAccountId,
        bytes memory _paraswapCallData
    )
    internal
    view
    returns (Actions.ActionArgs[] memory)
    {
        // TODO: if the LP token is used as the `_heldMarket`:
        // TODO: operate 1: liquidate the `_liquidAccount`, sell ALL of the LP token for `owedToken`; in the call to
        // TODO:            `exchange`, unwrap the LP token into its components and deposit.

        // TODO: if the LP token is used as the `_owedMarket`:
        // TODO: operate 1: liquidate the `_liquidAccount`, sell ALL of the `owedToken` for LP token components; in the call to
        // TODO:            `exchange`, wrap any needed components into a single LP token for re-deposit
        Actions.ActionArgs[] memory actions;
        ILiquidityTokenUnwrapperForLiquidation tokenUnwrapper =
            marketIdToTokenUnwrapperForLiquidationMap[_cache.heldMarket];
        uint256 outputMarket;
        {
            if (address(tokenUnwrapper) != address(0)) {
                outputMarket = tokenUnwrapper.outputMarketId();
                actions = new Actions.ActionArgs[](
                    1 + tokenUnwrapper.actionsLength() + (outputMarket == _cache.owedMarket ? 0 : 1)
                );
            } else {
                outputMarket = _cache.owedMarket;
                actions = new Actions.ActionArgs[](2);
            }
        }

        uint256 cursor = 0;
        if (_constants.expiry > 0) {
            // First action is a trade for closing the expired account
            // accountId is solidAccount; otherAccountId is liquidAccount
            actions[cursor++] = AccountActionLib.encodeExpiryLiquidateAction(
                _solidAccountId,
                _liquidAccountId,
                _cache.owedMarket,
                _cache.heldMarket,
                address(_constants.expiryProxy),
                _constants.expiry,
                _cache.flipMarkets
            );
        } else {
            // First action is a liquidation
            // accountId is solidAccount; otherAccountId is liquidAccount
            actions[cursor++] = AccountActionLib.encodeLiquidateAction(
                _solidAccountId,
                _liquidAccountId,
                _cache.owedMarket,
                _cache.heldMarket,
                _cache.owedWeiToLiquidate
            );
        }

        if (address(tokenUnwrapper) != address(0)) {
            actions[cursor++] = AccountActionLib.encodeExternalSellAction(
                _solidAccountId,
                outputMarket,
                _cache.owedMarket,
                /* _trader = */ address(this), // solium-disable-line indentation
                AccountActionLib.all(), // liquidate whatever we get from the intermediate step
                /* _amountOutMinWei = */ _cache.owedWeiToLiquidate, // solium-disable-line indentation
                _paraswapCallData
            );


            // Last action is a trade for selling the outputMarket into owedMarket
            // accountId is liquidAccount; otherAccountId is solidAccount
            if (_cache.owedMarket != outputMarket) {
                actions[cursor++] = AccountActionLib.encodeExternalSellAction(
                    _solidAccountId,
                    outputMarket,
                    _cache.owedMarket,
                    /* _trader = */ address(this), // solium-disable-line indentation
                    AccountActionLib.all(), // liquidate whatever we get from the intermediate step
                    /* _amountOutMinWei = */ _cache.owedWeiToLiquidate, // solium-disable-line indentation
                    _paraswapCallData
                );
            }
        } else {
            actions[cursor++] = AccountActionLib.encodeExternalSellAction(
                _solidAccountId,
                _cache.heldMarket,
                _cache.owedMarket,
                /* _trader = */ address(this), // solium-disable-line indentation
                _cache.solidHeldUpdateWithReward,
                _cache.owedWeiToLiquidate,
                _paraswapCallData
            );

        }

        return actions;
    }
}
