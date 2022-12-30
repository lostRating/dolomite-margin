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

import { AccountBalanceLib } from "../lib/AccountBalanceLib.sol";


interface IWrappedTokenWithUserVaultV1 {

    function depositIntoVault(uint256 _toAccountNumber, uint256 _amountWei) external;

    function withdrawFromVault(uint256 _fromAccountNumber, uint256 _amountWei) external;

    function openBorrowPosition(
        uint256 _fromAccountNumber,
        uint256 _toAccountNumber,
        uint256 _amountWei
    ) external;

    function closeBorrowPosition(
        uint256 _borrowAccountNumber,
        uint256 _toAccountNumber,
        uint256[] calldata _collateralMarketIds
    ) external;

    function transferBetweenAccounts(
        uint256 _fromAccountNumber,
        uint256 _toAccountNumber,
        uint256 _marketId,
        uint256 _amountWei,
        AccountBalanceLib.BalanceCheckFlag _balanceCheckFlag
    ) external;

    function repayAllForBorrowPosition(
        uint256 _toAccountNumber,
        uint256 _borrowAccountNumber,
        uint256 _marketId,
        AccountBalanceLib.BalanceCheckFlag _balanceCheckFlag
    ) external;

    function executeDepositIntoVault(uint256 _amountWei) external;

    function executeWithdrawalFromVault(uint256 _amountWei) external;
}
