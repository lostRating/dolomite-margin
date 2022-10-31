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

import { Address } from "@openzeppelin/contracts/utils/Address.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IDolomiteMargin } from "../../protocol/interfaces/IDolomiteMargin.sol";

import { Account } from "../../protocol/lib/Account.sol";
import { Actions } from "../../protocol/lib/Actions.sol";
import { Require } from "../../protocol/lib/Require.sol";
import { Types } from "../../protocol/lib/Types.sol";

import { OnlyDolomiteMargin } from "../helpers/OnlyDolomiteMargin.sol";

import { IBorrowPositionProxy } from "../interfaces/IBorrowPositionProxy.sol";
import "../helpers/AccountBalanceHelper.sol";


/**
 * @title   BorrowPositionProxy
 * @author  Dolomite
 *
 * @dev Proxy contract for opening borrow positions. This makes indexing easier and lowers gas costs on Arbitrum by
 *      minimizing call data
 */
contract BorrowPositionProxy is IBorrowPositionProxy, OnlyDolomiteMargin, AccountBalanceHelper, ReentrancyGuard {
    using Types for Types.Par;

    constructor (
        address dolomiteMargin
    )
    public
    OnlyDolomiteMargin(dolomiteMargin)
    {}

    function openBorrowPosition(
        uint256 _fromAccountIndex,
        uint256 _toAccountIndex,
        uint256 _marketId,
        uint256 _amountWei
    ) external {
        Account.Info[] memory accounts = new Account.Info[](2);
        accounts[0] = Account.Info(msg.sender, _fromAccountIndex);
        accounts[1] = Account.Info(msg.sender, _toAccountIndex);

        Actions.ActionArgs[] memory actions = new Actions.ActionArgs[](1);
        Types.AssetAmount memory assetAmount = Types.AssetAmount({
            sign: false,
            denomination: Types.AssetDenomination.Wei,
            ref: Types.AssetReference.Delta,
            value: _amountWei
        });
        actions[0] = Actions.ActionArgs({
            actionType : Actions.ActionType.Transfer,
            accountId : 0,
            amount : assetAmount,
            primaryMarketId : _marketId,
            secondaryMarketId : 0,
            otherAddress : address(0),
            otherAccountId : 1,
            data : bytes("")
        });

        // Emit this before the call to DolomiteMargin so indexers get it before the Transfer events are emitted
        emit BorrowPositionOpen(msg.sender, _toAccountIndex);

        IDolomiteMargin dolomiteMargin = IDolomiteMargin(DOLOMITE_MARGIN);
        dolomiteMargin.operate(accounts, actions);

        _verifyAccountIsNotNegative(dolomiteMargin, msg.sender, _fromAccountIndex, _marketId);
    }

    function closeBorrowPosition(
        uint256 _borrowAccountIndex,
        uint256 _toAccountIndex,
        uint256[] calldata _collateralMarketIds
    ) external {
        Account.Info[] memory accounts = new Account.Info[](2);
        accounts[0] = Account.Info(msg.sender, _borrowAccountIndex);
        accounts[1] = Account.Info(msg.sender, _toAccountIndex);

        Actions.ActionArgs[] memory actions = new Actions.ActionArgs[](_collateralMarketIds.length);
        Types.AssetAmount memory assetAmount = Types.AssetAmount({
            sign: false,
            denomination: Types.AssetDenomination.Wei,
            ref: Types.AssetReference.Target,
            value: 0
        });

        for (uint256 i = 0; i < _collateralMarketIds.length; i++) {
            actions[i] = Actions.ActionArgs({
                actionType : Actions.ActionType.Transfer,
                accountId : 0,
                amount : assetAmount,
                primaryMarketId : _collateralMarketIds[i],
                secondaryMarketId : 0,
                otherAddress : address(0),
                otherAccountId : 1,
                data : bytes("")
            });
        }

        IDolomiteMargin(DOLOMITE_MARGIN).operate(accounts, actions);
    }

    function transferBetweenAccounts(
        uint256 _fromAccountIndex,
        uint256 _toAccountIndex,
        uint256 _marketId,
        uint256 _amountWei,
        uint256 _canAccountsBeNegativeFlag
    ) external {
        Account.Info[] memory accounts = new Account.Info[](2);
        accounts[0] = Account.Info(msg.sender, _fromAccountIndex);
        accounts[1] = Account.Info(msg.sender, _toAccountIndex);

        Actions.ActionArgs[] memory actions = new Actions.ActionArgs[](1);
        Types.AssetAmount memory assetAmount = Types.AssetAmount({
            sign: false,
            denomination: Types.AssetDenomination.Wei,
            ref: Types.AssetReference.Delta,
            value: _amountWei
        });
        actions[0] = Actions.ActionArgs({
            actionType : Actions.ActionType.Transfer,
            accountId : 0,
            amount : assetAmount,
            primaryMarketId : _marketId,
            secondaryMarketId : 0,
            otherAddress : address(0),
            otherAccountId : 1,
            data : bytes("")
        });

        IDolomiteMargin dolomiteMargin = IDolomiteMargin(DOLOMITE_MARGIN);
        dolomiteMargin.operate(accounts, actions);

        if (_canAccountsBeNegativeFlag == 0) {
            // Neither account can be negative
            _verifyAccountIsNotNegative(dolomiteMargin, msg.sender, _fromAccountIndex, _marketId);
            _verifyAccountIsNotNegative(dolomiteMargin, msg.sender, _toAccountIndex, _marketId);
        } else if (_canAccountsBeNegativeFlag == 0x0F) {
            // Only the to account can be negative
            _verifyAccountIsNotNegative(dolomiteMargin, msg.sender, _toAccountIndex, _marketId);
        } else if (_canAccountsBeNegativeFlag == 0xF0) {
            // Only the from account can be negative
            _verifyAccountIsNotNegative(dolomiteMargin, msg.sender, _fromAccountIndex, _marketId);
        } else {
            Require.that(
                _canAccountsBeNegativeFlag == 0xFF,
                FILE,
                "Invalid flag"
            );
        }
    }

    function repayAllForBorrowPosition(
        uint256 _fromAccountIndex,
        uint256 _borrowAccountIndex,
        uint256 _marketId
    ) external {
        Account.Info[] memory accounts = new Account.Info[](2);
        accounts[0] = Account.Info(msg.sender, _borrowAccountIndex);
        accounts[1] = Account.Info(msg.sender, _fromAccountIndex);

        Actions.ActionArgs[] memory actions = new Actions.ActionArgs[](1);
        // This works by transferring all debt from _borrowAccountIndex to _fromAccountIndex
        Types.AssetAmount memory assetAmount = Types.AssetAmount({
            sign: false,
            denomination: Types.AssetDenomination.Wei,
            ref: Types.AssetReference.Target,
            value: 0
        });
        actions[0] = Actions.ActionArgs({
            actionType : Actions.ActionType.Transfer,
            accountId : 0,
            amount : assetAmount,
            primaryMarketId : _marketId,
            secondaryMarketId : 0,
            otherAddress : address(0),
            otherAccountId : 1,
            data : bytes("")
        });

        IDolomiteMargin(DOLOMITE_MARGIN).operate(accounts, actions);
    }

}
