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

import { IDolomiteMargin } from "../../protocol/interfaces/IDolomiteMargin.sol";

import { Types } from "../../protocol/lib/Types.sol";


/**
 * @title IGenericTraderProxyV1
 * @author Dolomite
 *
 * Trader proxy interface for trading assets using any trader from msg.sender
 */
interface IGenericTraderProxyV1 {

    // ============ Enums ============

    enum TraderType {
        ExternalLiquidity,
        InternalLiquidity,
        LiquidityTokenUnwrapper,
        LiquidityTokenWrapper
    }

    // ============ Structs ============

    struct TraderParams {
        /// @dev The type of trade to conduct
        TraderType traderType;
        /// @dev The address that is underwriting the trade. Only used when `InternalLiquidity` is set as the
        ///      `traderType`. Otherwise, this value must be set to `address(0)`.
        address makerAccountOwner;
        /// @dev The account number that is underwriting the trade. Only used when `InternalLiquidity` is set as the
        ///      `traderType`. Otherwise, this value must be set to `0`.
        uint256 makerAccountNumber;
        /// @dev The address of IAutoTrader or IExchangeWrapper that will be used to conduct the trade.
        address trader;
        /// @dev The data that will be passed through to the trader contract.
        bytes tradeData;
    }

    struct TransferAmount {
        /// @dev The market ID to transfer
        uint256 marketId;
        /// @dev Note, setting to uint(-1) will transfer all of the user's balance.
        uint256 amountWei;
    }

    struct TransferCollateralParams {
        /// @dev The account number from which collateral will be transferred.
        uint256 fromAccountNumber;
        /// @dev The account number to which collateral will be transferred.
        uint256 toAccountNumber;
        /// @dev The transfers to execute after all of the trades.
        TransferAmount[] transferAmounts;
    }

    struct ExpiryParams {
        /// @dev The market ID whose expiry will be updated.
        uint256 marketId;
        /// @dev The new expiry time delta for the market. Setting this to `0` will reset the expiration.
        uint32 expiryTimeDelta;
    }

    struct GenericTraderProxyCache {
        IDolomiteMargin dolomiteMargin;
        /// @dev    True if the user is making a margin deposit, false if they are withdrawing. False if the variable is
        ///         unused too.
        bool isMarginDeposit;
        /// @dev    The other account number that is not `_traderAccountNumber`. Only used for TransferCollateralParams.
        uint256 otherAccountNumber;
        /// @dev    The number of Account.Info structs in the Accounts array that are traders.
        uint256 traderAccountsLength;
        /// @dev    The index into the account array at which traders start.
        uint256 traderAccountStartIndex;
        /// @dev    The cursor for the looping through the operation's actions.
        uint256 actionsCursor;
        /// @dev    The cursor for the looping through the trader accounts. Starts at `traderAccountStartIndex`
        uint256 traderAccountCursor;
        /// @dev    The balance of `inputMarket` that the trader has before the call to `dolomiteMargin.operate`
        Types.Wei inputBalanceWeiBeforeOperate;
        /// @dev    The balance of `outputMarket` that the trader has before the call to `dolomiteMargin.operate`
        Types.Wei outputBalanceWeiBeforeOperate;
        /// @dev    The balance of `transferMarket` that the trader has before the call to `dolomiteMargin.operate`
        Types.Wei transferBalanceWeiBeforeOperate;
    }

    // ============ Functions ============

    /**
     * @dev     Swaps an exact amount of input (specified in the `_amountWeisPath[0]` parameter) for at least
     *          `_amountWeisPath[_amountWeisPath.length - 1]` of output.
     *
     * @param _tradeAccountNumber           The account number to use for msg.sender's trade
     * @param _marketIdPath                 The path of market IDs to use for each trade action. Length should be equal
     *                                      to `_tradersPath.length + 1`.
     * @param _amountWeisPath               The path of amounts (in wei) to use for each trade action. Length should be
     *                                      equal to `_tradersPath.length + 1`. Setting a value to `uint(-1)` will use
     *                                      the user's full balance for the trade at that part in the path. Caution must
     *                                      be taken when using this parameter for frontends that call this function.
     * @param _tradersPath                  The path of traders to use for each trade action. Length should be equal to
     *                                      `_marketIdPath.length - 1` and `_amountWeisPath.length - 1`.
     */
    function swapExactInputForOutput(
        uint256 _tradeAccountNumber,
        uint256[] calldata _marketIdPath,
        uint256[] calldata _amountWeisPath,
        TraderParams[] calldata _tradersPath
    )
    external;

    /**
     * @dev     The same function as `swapExactInputForOutput`, but allows the caller transfer collateral and modify
     *          their position's expiration in the same transaction.
     *
     * @param _tradeAccountNumber           The account number to use for msg.sender's trade
     * @param _marketIdPath                 The path of market IDs to use for each trade action. Length should be equal
     *                                      to `_tradersPath.length + 1`.
     * @param _amountWeisPath               The path of amounts (in wei) to use for each trade action. Length should be
     *                                      equal to `_tradersPath.length + 1`. Setting a value to `uint(-1)` will use
     *                                      the user's full balance for the trade at that part in the path. Caution must
     *                                      be taken when using this parameter for frontends that call this function.
     * @param _tradersPath                  The path of traders to use for each trade action. Length should be equal to
     *                                      `_marketIdPath.length - 1` and `_amountWeisPath.length - 1`.
     * @param _transferCollateralParams     The parameters for transferring collateral in/out of the
     *                                      `_tradeAccountNumber` once the trades settle. One of
     *                                      `_params.fromAccountNumber` or `_params.toAccountNumber` must be equal to
     *                                      `_tradeAccountNumber`.
     * @param _expiryParams                 The parameters for modifying the expiration of the debt in the position.
     */
    function swapExactInputForOutputAndModifyPosition(
        uint256 _tradeAccountNumber,
        uint256[] calldata _marketIdPath,
        uint256[] calldata _amountWeisPath,
        TraderParams[] calldata _tradersPath,
        TransferCollateralParams calldata _transferCollateralParams,
        ExpiryParams calldata _expiryParams
    )
    external;
}
