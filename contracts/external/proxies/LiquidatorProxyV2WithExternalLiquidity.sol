/*

    Copyright 2019 dYdX Trading Inc.

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

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IDolomiteMargin } from "../../protocol/interfaces/IDolomiteMargin.sol";

import { Account } from "../../protocol/lib/Account.sol";
import { Actions } from "../../protocol/lib/Actions.sol";
import { Decimal } from "../../protocol/lib/Decimal.sol";
import { Interest } from "../../protocol/lib/Interest.sol";
import { DolomiteMarginMath } from "../../protocol/lib/DolomiteMarginMath.sol";
import { Monetary } from "../../protocol/lib/Monetary.sol";
import { Require } from "../../protocol/lib/Require.sol";
import { Time } from "../../protocol/lib/Time.sol";
import { Types } from "../../protocol/lib/Types.sol";

import { AccountActionHelper } from "../helpers/AccountActionHelper.sol";
import { LiquidatorProxyHelper } from "../helpers/LiquidatorProxyHelper.sol";
import { IExpiry } from "../interfaces/IExpiry.sol";

import { DolomiteAmmRouterProxy } from "./DolomiteAmmRouterProxy.sol";


/**
 * @title LiquidatorProxyV2WithExternalLiquidity
 * @author Dolomite
 *
 * Contract for liquidating other accounts in DolomiteMargin and atomically selling off collateral via Paraswap
 * liquidity aggregation
 */
contract LiquidatorProxyV2WithExternalLiquidity is ReentrancyGuard, LiquidatorProxyHelper {
    using DolomiteMarginMath for uint256;
    using SafeMath for uint256;
    using Types for Types.Par;
    using Types for Types.Wei;

    // ============ Constants ============

    bytes32 constant FILE = "LiquidatorProxyV2";

    // ============ Events ============

    /**
     * @param solidAccountOwner         The liquidator's address
     * @param solidAccountOwner         The liquidator's account number
     * @param heldMarket                The held market (collateral) that will be received by the liquidator
     * @param heldDeltaWeiWithReward    The amount of heldMarket the liquidator will receive, including the reward
     *                                  (positive number)
     * @param profitHeldWei             The amount of profit the liquidator will realize by performing the liquidation
     *                                  and atomically selling off the collateral. Can be negative or positive.
     * @param owedMarket                The debt market that will be received by the liquidator
     * @param owedDeltaWei              The amount of owedMarket that will be received by the liquidator (negative
     *                                  number)
     */
    event LogLiquidateWithParaswap(
        address indexed solidAccountOwner,
        uint256 solidAccountNumber,
        uint256 heldMarket,
        uint256 heldDeltaWeiWithReward,
        Types.Wei profitHeldWei, // calculated as `heldWeiWithReward - soldHeldWeiToBreakEven`
        uint256 owedMarket,
        uint256 owedDeltaWei
    );

    // ============ Storage ============

    IDolomiteMargin DOLOMITE_MARGIN;
    IExpiry EXPIRY_PROXY;
    address PARASWAP_ROUTER;
    address TOKEN_TRANSFER_PROXY;

    // ============ Constructor ============

    constructor (
        address dolomiteMargin,
        address expiryProxy,
        address paraswapRouter,
        address tokenTransferProxy
    )
    public
    {
        DOLOMITE_MARGIN = IDolomiteMargin(dolomiteMargin);
        EXPIRY_PROXY = IExpiry(expiryProxy);
        PARASWAP_ROUTER = paraswapRouter;
        TOKEN_TRANSFER_PROXY = tokenTransferProxy;
    }

    // ============ Public Functions ============

    /**
     * Liquidate liquidAccount using solidAccount. This contract and the msg.sender to this contract
     * must both be operators for the solidAccount.
     *
     * @param  solidAccount                 The account that will do the liquidating
     * @param  liquidAccount                The account that will be liquidated
     * @param  owedMarket                   The owed market whose borrowed value will be added to `owedWeiToLiquidate`
     * @param  heldMarket                   The held market whose collateral will be recovered to take on the debt of
     *                                      `owedMarket`
     * @param  expiry                       The time at which the position expires, if this liquidation is for closing
     *                                      an expired position. Else, 0.
     * @param  paraswapCallData             The calldata to be passed along to Paraswap's router for liquidation
     */
    function liquidate(
        Account.Info memory solidAccount,
        Account.Info memory liquidAccount,
        uint256 owedMarket,
        uint256 heldMarket,
        uint256 expiry,
        bytes memory paraswapCallData
    )
    public
    nonReentrant
    {
        // put all values that will not change into a single struct
        Constants memory constants;
        constants.dolomiteMargin = DOLOMITE_MARGIN;

        Require.that(
            owedMarket != heldMarket,
            FILE,
            "owedMarket equals heldMarket",
            owedMarket,
            heldMarket
        );

        Require.that(
            !constants.dolomiteMargin.getAccountPar(liquidAccount, owedMarket).isPositive(),
            FILE,
            "owed market cannot be positive",
            owedMarket
        );

        Require.that(
            constants.dolomiteMargin.getAccountPar(liquidAccount, heldMarket).isPositive(),
            FILE,
            "held market cannot be negative",
            heldMarket
        );

        Require.that(
            uint32(expiry) == expiry,
            FILE,
            "expiry overflow",
            expiry
        );

        constants.solidAccount = solidAccount;
        constants.liquidAccount = liquidAccount;
        constants.liquidMarkets = constants.dolomiteMargin.getAccountMarketsWithBalances(liquidAccount);
        constants.markets = getMarketInfos(
            constants.dolomiteMargin,
            constants.dolomiteMargin.getAccountMarketsWithBalances(solidAccount),
            constants.liquidMarkets
        );
        constants.expiryProxy = expiry > 0 ? EXPIRY_PROXY: IExpiry(address(0));
        constants.expiry = uint32(expiry);

        LiquidatorProxyCache memory cache = initializeCache(
            constants,
            heldMarket,
            owedMarket
        );

        // validate the msg.sender and that the liquidAccount can be liquidated
        checkBasicRequirements(constants, heldMarket, owedMarket);

        // get the max liquidation amount
        calculateMaxLiquidationAmount(cache);

        // if nothing to liquidate, do nothing
        Require.that(
            cache.owedWeiToLiquidate != 0,
            FILE,
            "nothing to liquidate"
        );

        uint256 totalSolidHeldWei = cache.solidHeldUpdateWithReward;
        if (cache.solidHeldWei.sign) {
            // If the solid account has held wei, add the amount the solid account will receive from liquidation to its
            // total held wei
            // We do this so we can accurately track how much the solid account has (and will have after the swap), in
            // case we need to input it exactly to Router#getParamsForSwapExactTokensForTokens
            totalSolidHeldWei = totalSolidHeldWei.add(cache.solidHeldWei.value);
        }

        (
            Account.Info[] memory accounts,
            Actions.ActionArgs[] memory actions
        ) = ROUTER_PROXY.getParamsForSwapTokensForExactTokens(
            constants.solidAccount.owner,
            constants.solidAccount.number,
            uint(- 1), // maxInputWei
            cache.owedWeiToLiquidate, // the amount of owedMarket that needs to be repaid. Exact output amount
            tokenPath
        );

        if (cache.solidHeldUpdateWithReward >= actions[0].amount.value) {
            uint256 profit = cache.solidHeldUpdateWithReward.sub(actions[0].amount.value);
            uint256 _owedMarket = owedMarket; // used to prevent the "stack too deep" error
            emit LogLiquidateWithAmm(
                constants.solidAccount.owner,
                constants.solidAccount.number,
                heldMarket,
                cache.solidHeldUpdateWithReward,
                Types.Wei(true, profit),
                _owedMarket,
                cache.owedWeiToLiquidate
            );
        } else {
            Require.that(
                !revertOnFailToSellCollateral,
                FILE,
                "totalSolidHeldWei is too small",
                totalSolidHeldWei,
                actions[0].amount.value
            );

            // This value needs to be calculated before `actions` is overwritten below with the new swap parameters
            uint256 profit = actions[0].amount.value.sub(cache.solidHeldUpdateWithReward);
            (accounts, actions) = ROUTER_PROXY.getParamsForSwapExactTokensForTokens(
                constants.solidAccount.owner,
                constants.solidAccount.number,
                totalSolidHeldWei, // inputWei
                minOwedOutputAmount,
                tokenPath
            );

            uint256 _owedMarket = owedMarket; // used to prevent the "stack too deep" error
            emit LogLiquidateWithAmm(
                constants.solidAccount.owner,
                constants.solidAccount.number,
                heldMarket,
                cache.solidHeldUpdateWithReward,
                Types.Wei(false, profit),
                _owedMarket,
                cache.owedWeiToLiquidate
            );
        }

        accounts = constructAccountsArray(constants, accounts);

        // execute the liquidations
        constants.dolomiteMargin.operate(
            accounts,
            constructActionsArray(constants, cache, accounts, actions) //solium-disable-line arg-overflow
        );
    }

    // ============ Calculation Functions ============

    /**
     * Calculate the additional owedAmount that can be liquidated until the collateralization of the
     * liquidator account reaches the minLiquidatorRatio. By this point, the cache will be set such
     * that the amount of owedMarket is non-positive and the amount of heldMarket is non-negative.
     */
    function calculateMaxLiquidationAmount(
        LiquidatorProxyCache memory cache
    )
    private
    pure
    {
        uint256 liquidHeldValue = cache.heldPrice.mul(cache.liquidHeldWei.value);
        uint256 liquidOwedValue = cache.owedPriceAdj.mul(cache.liquidOwedWei.value);
        if (liquidHeldValue <= liquidOwedValue) {
            // The user is under-collateralized; there is no reward left to give
            cache.solidHeldUpdateWithReward = cache.liquidHeldWei.value;
            cache.owedWeiToLiquidate = DolomiteMarginMath.getPartialRoundUp(
                cache.liquidHeldWei.value,
                cache.heldPrice,
                cache.owedPriceAdj
            );
        } else {
            cache.solidHeldUpdateWithReward = DolomiteMarginMath.getPartial(
                cache.liquidOwedWei.value,
                cache.owedPriceAdj,
                cache.heldPrice
            );
            cache.owedWeiToLiquidate = cache.liquidOwedWei.value;
        }
    }

    // ============ Operation-Construction Functions ============

    function constructAccountsArray(
        Constants memory constants,
        Account.Info[] memory accountsForTrade
    )
    private
    pure
    returns (Account.Info[] memory)
    {
        Account.Info[] memory accounts = new Account.Info[](accountsForTrade.length + 1);
        for (uint256 i = 0; i < accountsForTrade.length; i++) {
            accounts[i] = accountsForTrade[i];
        }
        assert(
            accounts[0].owner == constants.solidAccount.owner &&
            accounts[0].number == constants.solidAccount.number
        );

        accounts[accounts.length - 1] = constants.liquidAccount;
        return accounts;
    }

    function constructActionsArray(
        Constants memory constants,
        LiquidatorProxyCache memory cache,
        Account.Info[] memory accounts,
        Actions.ActionArgs[] memory actionsForTrade
    )
    private
    pure
    returns (Actions.ActionArgs[] memory)
    {
        Actions.ActionArgs[] memory actions = new Actions.ActionArgs[](actionsForTrade.length + 1);

        if (constants.expiry > 0) {
            // First action is a trade for closing the expired account
            // accountId is solidAccount; otherAccountId is liquidAccount
            actions[0] = AccountActionHelper.encodeExpiryLiquidateAction(
                /* _solidAccountId = */ 0, // solium-disable-line indentation
                /* _liquidAccountId = */ accounts.length - 1, // solium-disable-line indentation
                constants.owedMarket,
                cache.heldMarket,
                cache.owedWeiToLiquidate,
                address(cache.expiryProxy),
                constants.expiry
            );
        } else {
            // First action is a liquidation
            // accountId is solidAccount; otherAccountId is liquidAccount
            actions[0] = AccountActionHelper.encodeLiquidateAction(
                /* _solidAccountId = */ 0, // solium-disable-line indentation
                /* _liquidAccountId = */ accounts.length - 1, // solium-disable-line indentation
                cache.owedMarket,
                cache.heldMarket,
                cache.owedWeiToLiquidate
            );
        }

        for (uint256 i = 0; i < actionsForTrade.length; i++) {
            actions[i + 1] = actionsForTrade[i];
        }

        return actions;
    }
}
