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

import { IDolomiteMargin } from "../../protocol/interfaces/IDolomiteMargin.sol";
import { IExpiry } from "../interfaces/IExpiry.sol";

import { Account } from "../../protocol/lib/Account.sol";
import { Bits } from "../../protocol/lib/Bits.sol";
import { Decimal } from "../../protocol/lib/Decimal.sol";
import { Interest } from "../../protocol/lib/Interest.sol";
import { Monetary } from "../../protocol/lib/Monetary.sol";
import { Require } from "../../protocol/lib/Require.sol";
import { Types } from "../../protocol/lib/Types.sol";


/**
 * @title LiquidatorProxyHelper
 * @author Dolomite
 *
 * Inheritable contract that allows sharing code across different liquidator proxy contracts
 */
contract LiquidatorProxyHelper {
    using SafeMath for uint;
    using Types for Types.Par;

    // ============ Constants ============

    bytes32 private constant FILE = "LiquidatorProxyHelper";
    uint256 private constant MAX_UINT_BITS = 256;
    uint256 private constant ONE = 1;

    // ============ Structs ============

    struct MarketInfo {
        uint256 marketId;
        Decimal.D256 spreadPremium;
        Monetary.Price price;
        Interest.Index index;
    }

    // ============ Structs ============

    struct Constants {
        IDolomiteMargin dolomiteMargin;
        Account.Info solidAccount;
        Account.Info liquidAccount;
        MarketInfo[] markets;
        uint256[] liquidMarkets;
        IExpiry expiryProxy;
        uint32 expiry;
    }

    struct LiquidatorProxyCache {
        // mutable
        uint256 owedWeiToLiquidate;
        // The amount of heldMarket the solidAccount will receive. Includes the liquidation reward.
        uint256 solidHeldUpdateWithReward;
        Types.Wei solidHeldWei;
        Types.Wei solidOwedWei;
        Types.Wei liquidHeldWei;
        Types.Wei liquidOwedWei;
        uint256 solidSupplyValue;
        uint256 solidBorrowValue;

        // immutable
        Decimal.D256 spread;
        uint256 heldMarket;
        uint256 owedMarket;
        uint256 heldPrice;
        uint256 owedPrice;
        uint256 owedPriceAdj;
    }

    // ============ Internal Functions ============

    // ============ Getter Functions ============


    /**
     * Pre-populates cache values for some pair of markets.
     */
    function initializeCache(
        Constants memory constants,
        uint256 heldMarket,
        uint256 owedMarket,
        bool fetchAccountValues
    )
    private
    view
    returns (LiquidatorProxyCache memory)
    {
        MarketInfo memory heldMarketInfo = binarySearch(constants.markets, heldMarket);
        MarketInfo memory owedMarketInfo = binarySearch(constants.markets, owedMarket);
        uint256 heldPrice = heldMarketInfo.price.value;
        uint256 owedPrice = owedMarketInfo.price.value;

        Monetary.Value memory solidSupplyValue;
        Monetary.Value memory solidBorrowValue;
        if (fetchAccountValues) {
            (solidSupplyValue, solidBorrowValue) = getAccountValues(
                constants.dolomiteMargin,
                constants.markets,
                constants.solidAccount,
                constants.dolomiteMargin.getAccountMarketsWithBalances(constants.solidAccount)
            );
        } else {
            solidSupplyValue = Monetary.Value({
                value: 0
            });
            solidBorrowValue = Monetary.Value({
                value: 0
            });
        }

        Decimal.D256 memory spread = constants.dolomiteMargin.getLiquidationSpreadForPair(heldMarket, owedMarket);
        uint256 owedPriceAdj;
        if (constants.expiry > 0) {
            (, Monetary.Price memory owedPricePrice) = constants.expiryProxy.getSpreadAdjustedPrices(
                heldMarket,
                owedMarket,
                constants.expiry
            );
            owedPriceAdj = owedPricePrice.value;
        } else {
            owedPriceAdj = Decimal.mul(owedPrice, Decimal.onePlus(spread));
        }

        return LiquidatorProxyCache({
            owedWeiToLiquidate: 0,
            solidHeldUpdateWithReward: 0,
            solidHeldWei: Interest.parToWei(
                constants.dolomiteMargin.getAccountPar(constants.solidAccount, heldMarket),
                heldMarketInfo.index
            ),
            solidOwedWei: Interest.parToWei(
                constants.dolomiteMargin.getAccountPar(constants.solidAccount, owedMarket),
                owedMarketInfo.index
            ),
            liquidHeldWei: Interest.parToWei(
                constants.dolomiteMargin.getAccountPar(constants.liquidAccount, heldMarket),
                heldMarketInfo.index
            ),
            liquidOwedWei: Interest.parToWei(
                constants.dolomiteMargin.getAccountPar(constants.liquidAccount, owedMarket),
                owedMarketInfo.index
            ),
            solidSupplyValue: solidSupplyValue.value,
            solidBorrowValue: solidBorrowValue.value,
            spread: spread,
            heldMarket: heldMarket,
            owedMarket: owedMarket,
            heldPrice: heldPrice,
            owedPrice: owedPrice,
            owedPriceAdj: owedPriceAdj
        });
    }

    /**
     * Make some basic checks before attempting to liquidate an account.
     *  - Require that the msg.sender has the permission to use the liquidator account
     *  - Require that the liquid account is liquidatable based on the accounts global value (all assets held and owed,
     *    not just what's being liquidated)
     */
    function checkBasicRequirements(
        Constants memory constants,
        uint256 owedMarket
    )
    private
    view
    {
        // check credentials for msg.sender
        Require.that(
            constants.solidAccount.owner == msg.sender
            || constants.dolomiteMargin.getIsLocalOperator(constants.solidAccount.owner, msg.sender),
            FILE,
            "Sender not operator",
            constants.solidAccount.owner
        );

        if (constants.expiry == 0) {
            // user is getting liquidated, not expired. Check liquid account is indeed liquid
            (
                Monetary.Value memory liquidSupplyValue,
                Monetary.Value memory liquidBorrowValue
            ) = getAdjustedAccountValues(
                constants.dolomiteMargin,
                constants.markets,
                constants.liquidAccount,
                constants.liquidMarkets
            );
            Require.that(
                liquidSupplyValue.value != 0,
                FILE,
                "Liquid account no supply"
            );
            Require.that(
                constants.dolomiteMargin.getAccountStatus(constants.liquidAccount) == Account.Status.Liquid
                || !isCollateralized(
                    liquidSupplyValue.value,
                    liquidBorrowValue.value,
                    constants.dolomiteMargin.getMarginRatio()
                ),
                FILE,
                "Liquid account not liquidatable"
            );
        } else {
            // check the expiration is valid; to get here we already know constants.expiry != 0
            uint32 expiry = constants.expiryProxy.getExpiry(constants.liquidAccount, owedMarket);
            Require.that(
                expiry == constants.expiry,
                FILE,
                "expiry mismatch",
                expiry,
                constants.expiry
            );
            Require.that(
                expiry <= Time.currentTime(),
                FILE,
                "Borrow not yet expired",
                expiry
            );
        }
    }

    /**
     * Returns true if the supplyValue over-collateralizes the borrowValue by the ratio.
     */
    function isCollateralized(
        uint256 supplyValue,
        uint256 borrowValue,
        Decimal.D256 memory ratio
    )
    internal
    pure
    returns (bool)
    {
        uint256 requiredMargin = Decimal.mul(borrowValue, ratio);
        return supplyValue >= borrowValue.add(requiredMargin);
    }

    /**
     * Gets the current total supplyValue and borrowValue for some account. Takes into account what
     * the current index will be once updated.
     */
    function getAccountValues(
        IDolomiteMargin dolomiteMargin,
        MarketInfo[] memory marketInfos,
        Account.Info memory account,
        uint256[] memory marketIds
    )
    internal
    view
    returns (
        Monetary.Value memory,
        Monetary.Value memory
    )
    {
        return getAccountValues(
            dolomiteMargin,
            marketInfos,
            account,
            marketIds,
            /* adjustForSpreadPremiums = */ false // solium-disable-line indentation
        );
    }

    /**
     * Gets the adjusted current total supplyValue and borrowValue for some account. Takes into account what
     * the current index will be once updated and the spread premium.
     */
    function getAdjustedAccountValues(
        IDolomiteMargin dolomiteMargin,
        MarketInfo[] memory marketInfos,
        Account.Info memory account,
        uint256[] memory marketIds
    )
    internal
    view
    returns (
        Monetary.Value memory,
        Monetary.Value memory
    )
    {
        return getAccountValues(
            dolomiteMargin,
            marketInfos,
            account,
            marketIds,
            /* adjustForSpreadPremiums = */ true // solium-disable-line indentation
        );
    }

    // ============ Internal Functions ============

    function getMarketInfos(
        IDolomiteMargin dolomiteMargin,
        uint256[] memory solidMarkets,
        uint256[] memory liquidMarkets
    ) internal view returns (MarketInfo[] memory) {
        uint[] memory marketBitmaps = Bits.createBitmaps(dolomiteMargin.getNumMarkets());
        uint marketsLength = 0;
        marketsLength = _addMarketsToBitmap(solidMarkets, marketBitmaps, marketsLength);
        marketsLength = _addMarketsToBitmap(liquidMarkets, marketBitmaps, marketsLength);

        uint counter = 0;
        MarketInfo[] memory marketInfos = new MarketInfo[](marketsLength);
        for (uint i = 0; i < marketBitmaps.length; i++) {
            uint bitmap = marketBitmaps[i];
            while (bitmap != 0) {
                uint nextSetBit = Bits.getLeastSignificantBit(bitmap);
                uint marketId = Bits.getMarketIdFromBit(i, nextSetBit);

                marketInfos[counter++] = MarketInfo({
                    marketId: marketId,
                    spreadPremium: dolomiteMargin.getMarketSpreadPremium(marketId),
                    price: dolomiteMargin.getMarketPrice(marketId),
                    index: dolomiteMargin.getMarketCurrentIndex(marketId)
                });

                // unset the set bit
                bitmap = Bits.unsetBit(bitmap, nextSetBit);
            }
            if (counter == marketsLength) {
                break;
            }
        }

        return marketInfos;
    }

    function binarySearch(
        MarketInfo[] memory markets,
        uint marketId
    ) internal pure returns (MarketInfo memory) {
        return _binarySearch(
            markets,
            0,
            markets.length,
            marketId
        );
    }

    // ============ Private Functions ============

    function getAccountValues(
        IDolomiteMargin dolomiteMargin,
        MarketInfo[] memory marketInfos,
        Account.Info memory account,
        uint256[] memory marketIds,
        bool adjustForSpreadPremiums
    )
    private
    view
    returns (
        Monetary.Value memory,
        Monetary.Value memory
    )
    {
        Monetary.Value memory supplyValue;
        Monetary.Value memory borrowValue;

        for (uint256 i = 0; i < marketIds.length; i++) {
            Types.Par memory par = dolomiteMargin.getAccountPar(account, marketIds[i]);
            MarketInfo memory marketInfo = binarySearch(marketInfos, marketIds[i]);
            Types.Wei memory userWei = Interest.parToWei(par, marketInfo.index);
            uint256 assetValue = userWei.value.mul(marketInfo.price.value);
            Decimal.D256 memory spreadPremium = Decimal.one();
            if (adjustForSpreadPremiums) {
                spreadPremium = Decimal.onePlus(marketInfo.spreadPremium);
            }
            if (userWei.sign) {
                supplyValue.value = supplyValue.value.add(Decimal.div(assetValue, spreadPremium));
            } else {
                borrowValue.value = borrowValue.value.add(Decimal.mul(assetValue, spreadPremium));
            }
        }

        return (supplyValue, borrowValue);
    }

    // solium-disable-next-line security/no-assign-params
    function _addMarketsToBitmap(
        uint256[] memory markets,
        uint256[] memory bitmaps,
        uint marketsLength
    ) private pure returns (uint) {
        for (uint i = 0; i < markets.length; i++) {
            if (!Bits.hasBit(bitmaps, markets[i])) {
                Bits.setBit(bitmaps, markets[i]);
                marketsLength += 1;
            }
        }
        return marketsLength;
    }

    function _binarySearch(
        MarketInfo[] memory markets,
        uint beginInclusive,
        uint endExclusive,
        uint marketId
    ) private pure returns (MarketInfo memory) {
        uint len = endExclusive - beginInclusive;
        if (len == 0 || (len == 1 && markets[beginInclusive].marketId != marketId)) {
            revert("LiquidatorProxyHelper: item not found");
        }

        uint mid = beginInclusive + len / 2;
        uint midMarketId = markets[mid].marketId;
        if (marketId < midMarketId) {
            return _binarySearch(
                markets,
                beginInclusive,
                mid,
                marketId
            );
        } else if (marketId > midMarketId) {
            return _binarySearch(
                markets,
                mid + 1,
                endExclusive,
                marketId
            );
        } else {
            return markets[mid];
        }
    }

}
