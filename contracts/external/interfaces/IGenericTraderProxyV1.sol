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
        TraderType traderType;
        address accountOwner;
        uint256 accountNumber;
        address trader;
        bytes tradeData;
    }

    struct TransferAmount {
        uint256 marketId;
        /// @dev Note, setting to uint(-1) will transfer all of the user's balance.
        uint256 amountWei;
    }

    struct TransferCollateralParams {
        uint256 fromAccountNumber;
        uint256 toAccountNumber;
        TransferAmount[] transferAmounts;
    }

    struct ExpiryParams {
        uint256 marketId;
        uint32 expiryTimeDelta;
    }

    struct GenericTradeProxyCache {
        IDolomiteMargin dolomiteMargin;
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
    }

    // ============ Functions ============

    function swapExactInputForOutput(
        uint256 _tradeAccountNumber,
        uint256[] calldata _marketIdPath,
        uint256[] calldata _amountWeisPath,
        TraderParams[] calldata _tradersPath
    )
    external;

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
