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

import { ILiquidityTokenUnwrapperTrader } from "../interfaces/ILiquidityTokenUnwrapperTrader.sol";
import { ILiquidityTokenWrapperTrader } from "../interfaces/ILiquidityTokenWrapperTrader.sol";

import { AccountActionLib } from "../lib/AccountActionLib.sol";

import { LiquidatorProxyV2WithExternalLiquidity } from "./LiquidatorProxyV2WithExternalLiquidity.sol";


/**
 * @title LiquidatorProxyV4WithExternalLiquidityToken
 * @author Dolomite
 *
 * Contract for liquidating other accounts in DolomiteMargin that use external LP token(s) (ones that are not native to
 * Dolomite) as collateral or debt. All collateral is atomically sold off via Paraswap liquidity aggregation.
 */
contract LiquidatorProxyV3WithLiquidityToken is LiquidatorProxyV2WithExternalLiquidity {

    // ============ Events ============

    struct LiquidatorProxyV3Cache {
        uint256 actionCursor;
        uint256 marketCursor;
        uint256 solidAccountId;
        uint256 liquidAccountId;
        ILiquidityTokenUnwrapperTrader tokenUnwrapper;
        ILiquidityTokenWrapperTrader tokenWrapper;
        Actions.ActionArgs[] actions;
    }

    // ============ Constants ============

    bytes32 private constant FILE = "LiquidatorProxyV3";

    // ============ Constructor ============

    constructor (
        address _expiryProxy,
        address _dolomiteMargin,
        address _liquidatorAssetRegistry
    )
    public
    LiquidatorProxyV2WithExternalLiquidity(
        _expiryProxy,
        _dolomiteMargin,
        _liquidatorAssetRegistry
    )
    {}

    // ============ Internal Functions ============

    function _constructActionsArray(
        LiquidatorProxyConstants memory _constants,
        LiquidatorProxyCache memory _proxyCache,
        uint256 _solidAccountId,
        uint256 _liquidAccountId,
        uint256[] memory _marketIdsForSellActionsPath,
        uint256[] memory _amountWeisForSellActionsPath
    )
        internal
        view
        returns (Actions.ActionArgs[] memory)
    {
        // This cache is created to prevent "stack too deep" errors
        LiquidatorProxyV3Cache memory v3Cache = LiquidatorProxyV3Cache({
            actionCursor: 0,
            solidAccountId: _solidAccountId,
            liquidAccountId: _liquidAccountId,
            tokenUnwrapper: LIQUIDATOR_ASSET_REGISTRY.getLiquidityTokenUnwrapperForAsset(_proxyCache.heldMarket),
            tokenWrapper: LIQUIDATOR_ASSET_REGISTRY.getLiquidityTokenWrapperForAsset(_proxyCache.owedMarket),
            actions: new Actions.ActionArgs[](0)
        });

        _validateV3Cache(v3Cache, _constants, _marketIdsForSellActionsPath);

        {
            uint256 unwrapperActionsLength = address(v3Cache.tokenUnwrapper) != address(0)
                ? v3Cache.tokenUnwrapper.actionsLength()
                : 0;
            uint256 wrapperActionsLength = address(v3Cache.tokenWrapper) != address(0)
                ? v3Cache.tokenWrapper.actionsLength()
                : 0;
            uint256 sellActionLength = _constants.trader != address(0) ? 1 : 0;
            v3Cache.actions = new Actions.ActionArgs[](
                1 + unwrapperActionsLength + wrapperActionsLength + sellActionLength
            ); // add 1 for the liquidation action
        }

        _encodeLiquidateAction(_proxyCache, _constants, v3Cache);

        assert(v3Cache.marketCursor == 0); // the liquidation action should not have moved the cursor

        _encodeUnwrapActions(
            _proxyCache,
            _constants,
            v3Cache,
            _marketIdsForSellActionsPath,
            _amountWeisForSellActionsPath
        );

        _encodeSellActions(
            _proxyCache,
            _constants,
            v3Cache,
            _marketIdsForSellActionsPath,
            _amountWeisForSellActionsPath
        );

        return v3Cache.actions;
    }

    function _validateV3Cache(
        LiquidatorProxyV3Cache memory _v3Cache,
        LiquidatorProxyConstants memory _constants,
        uint256[] memory _marketIdsForSellActionsPath
    ) internal pure {
        Require.that(
            address(_v3Cache.tokenUnwrapper) != address(0) || address(_v3Cache.tokenWrapper) != address(0),
            FILE,
            "No token converter found"
        );

        uint256 actionCounter = 1;
        actionCounter += address(_v3Cache.tokenUnwrapper) != address(0) ? 1 : 0;
        actionCounter += address(_v3Cache.tokenWrapper) != address(0) ? 1 : 0;
        actionCounter += _constants.trader != address(0) ? 1 : 0;
        Require.that(
            _marketIdsForSellActionsPath.length == actionCounter,
            FILE,
            "Invalid action path length",
            _marketIdsForSellActionsPath.length,
            actionCounter
        );
    }

    function _encodeLiquidateAction(
        LiquidatorProxyCache memory _proxyCache,
        LiquidatorProxyConstants memory _constants,
        LiquidatorProxyV3Cache memory _v3Cache
    )
        internal
        pure
    {
        if (_constants.expiry > 0) {
            // accountId is solidAccount; otherAccountId is liquidAccount
            _v3Cache.actions[_v3Cache.actionCursor++] = AccountActionLib.encodeExpiryLiquidateAction(
                _v3Cache.solidAccountId,
                _v3Cache.liquidAccountId,
                _proxyCache.owedMarket,
                _proxyCache.heldMarket,
                address(_constants.expiryProxy),
                _constants.expiry,
                _proxyCache.owedWeiToLiquidate,
                _proxyCache.flipMarketsForExpiration
            );
        } else {
            // accountId is solidAccount; otherAccountId is liquidAccount
            _v3Cache.actions[_v3Cache.actionCursor++] = AccountActionLib.encodeLiquidateAction(
                _v3Cache.solidAccountId,
                _v3Cache.liquidAccountId,
                _proxyCache.owedMarket,
                _proxyCache.heldMarket,
                _proxyCache.owedWeiToLiquidate
            );
        }
    }

    function _encodeUnwrapActions(
        LiquidatorProxyCache memory _proxyCache,
        LiquidatorProxyConstants memory _constants,
        LiquidatorProxyV3Cache memory _v3Cache,
        uint256[] memory _marketIdsForSellActionsPath,
        uint256[] memory _amountWeisForSellActionsPath
    ) internal view {
        if (address(_v3Cache.tokenUnwrapper) != address(0)) {
            // Get the actions for selling the `_cache.heldMarket` into `outputMarket`
            ILiquidityTokenUnwrapperTrader tokenUnwrapper = _v3Cache.tokenUnwrapper;
            Actions.ActionArgs[] memory unwrapActions = tokenUnwrapper.createActionsForUnwrapping(
                _v3Cache.solidAccountId,
                _v3Cache.liquidAccountId,
                _constants.solidAccount.owner,
                _constants.liquidAccount.owner,
                /* _outputMarket = */ _marketIdsForSellActionsPath[_v3Cache.marketCursor + 1],
                /* _inputMarket = */ _marketIdsForSellActionsPath[_v3Cache.marketCursor],
//                _proxyCache.owedWeiToLiquidate,
//                _proxyCache.solidHeldUpdateWithReward
            );
            _v3Cache.marketCursor += 1;
            for (uint256 i = 0; i < unwrapActions.length; i++) {
                _v3Cache.actions[_v3Cache.actionCursor++] = unwrapActions[i];
            }
        }
    }

    function _encodeSellActions(
        LiquidatorProxyCache memory _proxyCache,
        LiquidatorProxyConstants memory _constants,
        LiquidatorProxyV3Cache memory _v3Cache,
        uint256[] memory _marketIdsForSellActionsPath,
        uint256[] memory _amountWeisForSellActionsPath
    ) internal view {
        if (_constants.trader != address(0)) {
            _v3Cache.actions[_v3Cache.actionCursor++] = AccountActionLib.encodeExternalSellAction(
                _v3Cache.solidAccountId,
                /* _primaryMarketId = */ _marketIdsForSellActionsPath[_v3Cache.marketCursor],
                /* _secondaryMarketId = */ _marketIdsForSellActionsPath[_v3Cache.marketCursor + 1],
                _constants.trader,
//                _proxyCache.solidHeldUpdateWithReward,
//                _proxyCache.owedWeiToLiquidate,
                _constants.orderData
            );
            _v3Cache.marketCursor += 1;
        }
    }

    function _encodeWrapActions(
        LiquidatorProxyCache memory _proxyCache,
        LiquidatorProxyConstants memory _constants,
        LiquidatorProxyV3Cache memory _v3Cache,
        uint256[] memory _marketIdsForSellActionsPath,
        uint256[] memory _amountWeisForSellActionsPath
    ) internal view {
        if (address(_v3Cache.tokenWrapper) != address(0)) {
            // Get the actions for selling the `_cache.heldMarket` into `outputMarket`
            ILiquidityTokenWrapperTrader tokenWrapper = _v3Cache.tokenWrapper;
            Actions.ActionArgs[] memory unwrapActions = tokenWrapper.createActionsForWrapping(
                _v3Cache.solidAccountId,
                _v3Cache.liquidAccountId,
                _constants.solidAccount.owner,
                _constants.liquidAccount.owner,
                /* _outputMarket = */ _marketIdsForSellActionsPath[_v3Cache.marketCursor + 1],
                /* _inputMarket = */ _marketIdsForSellActionsPath[_v3Cache.marketCursor],
//                _proxyCache.owedWeiToLiquidate,
//                _proxyCache.solidHeldUpdateWithReward
            );
            _v3Cache.marketCursor += 1;
            for (uint256 i = 0; i < unwrapActions.length; i++) {
                _v3Cache.actions[_v3Cache.actionCursor++] = unwrapActions[i];
            }
        }
    }
}
