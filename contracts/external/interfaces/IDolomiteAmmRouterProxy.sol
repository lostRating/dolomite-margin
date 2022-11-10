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
import { Events } from "../../protocol/lib/Events.sol";
import { Types } from "../../protocol/lib/Types.sol";

import { AccountBalanceHelper } from "../helpers/AccountBalanceHelper.sol";

import { IDolomiteAmmFactory } from "../interfaces/IDolomiteAmmFactory.sol";
import { IDolomiteAmmPair } from "../interfaces/IDolomiteAmmPair.sol";


interface IDolomiteAmmRouterProxy {

    // ============ Events ============

    event MarginPositionOpen(
        address indexed user,
        uint256 indexed accountIndex,
        address inputToken,
        address outputToken,
        address depositToken,
        Events.BalanceUpdate inputBalanceUpdate, // the amount of borrow amount being sold to purchase collateral
        Events.BalanceUpdate outputBalanceUpdate, // the amount of collateral purchased by the borrowed amount
        Events.BalanceUpdate marginDepositUpdate
    );

    event MarginPositionClose(
        address indexed user,
        uint256 indexed accountIndex,
        address inputToken,
        address outputToken,
        address withdrawalToken,
        Events.BalanceUpdate inputBalanceUpdate, // the amount of held amount being sold to repay debt
        Events.BalanceUpdate outputBalanceUpdate, // the amount of borrow amount being repaid
        Events.BalanceUpdate marginWithdrawalUpdate
    );

    // ============ Structs ============

    struct ModifyPositionParams {
        uint256 fromAccountNumber;
        uint256 toAccountNumber;
        Types.AssetAmount amountIn;
        Types.AssetAmount amountOut;
        address[] tokenPath;
        /// the token to be deposited/withdrawn to/from account number. To not perform any margin deposits or
        /// withdrawals, simply set this to `address(0)`
        address depositToken;
        /// the amount of the margin deposit/withdrawal, in wei. Whether or not this is a deposit or withdrawal depends
        /// on what fromAccountNumber or toAccountNumber are set to.
        uint256 marginDeposit;
        /// the amount of seconds from the time at which the position is opened to expiry. 0 for no expiration
        uint256 expiryTimeDelta;
        AccountBalanceHelper.BalanceCheckFlag balanceCheckFlag;
    }

    struct ModifyPositionCache {
        ModifyPositionParams params;
        IDolomiteMargin dolomiteMargin;
        IDolomiteAmmFactory ammFactory;
        address account;
        uint[] marketPath;
        uint[] amountsWei;
        /// this value is calculated for emitting an event only
        uint256 marginDepositDeltaWei;
    }

    struct PermitSignature {
        bool approveMax;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function getPairInitCodeHash() external view returns (bytes32);

    function addLiquidity(
        uint256 _accountNumber,
        address _to,
        address _tokenA,
        address _tokenB,
        uint256 _amountADesired,
        uint256 _amountBDesired,
        uint256 _amountAMinWei,
        uint256 _amountBMinWei,
        uint256 _deadline,
        AccountBalanceHelper.BalanceCheckFlag _balanceCheckFlag
    )
    external
    returns (uint256 amountAWei, uint256 amountBWei, uint256 liquidity);

    function addLiquidityAndDepositIntoDolomite(
        uint256 _fromAccountNumber,
        uint256 _toAccountNumber,
        address _tokenA,
        address _tokenB,
        uint256 _amountADesired,
        uint256 _amountBDesired,
        uint256 _amountAMinWei,
        uint256 _amountBMinWei,
        uint256 _deadline,
        AccountBalanceHelper.BalanceCheckFlag _balanceCheckFlag
    )
    external
    returns (uint256 amountAWei, uint256 amountBWei, uint256 liquidity);

    function swapExactTokensForTokens(
        uint256 _accountNumber,
        uint256 _amountInWei,
        uint256 _amountOutMinWei,
        address[] calldata _tokenPath,
        uint256 _deadline,
        AccountBalanceHelper.BalanceCheckFlag _balanceCheckFlag
    )
    external;

    function getParamsForSwapExactTokensForTokens(
        address _account,
        uint256 _accountNumber,
        uint256 _amountInWei,
        uint256 _amountOutMinWei,
        address[] calldata _tokenPath
    )
    external view returns (Account.Info[] memory, Actions.ActionArgs[] memory);

    function swapTokensForExactTokens(
        uint256 _accountNumber,
        uint256 _amountInMaxWei,
        uint256 _amountOutWei,
        address[] calldata _tokenPath,
        uint256 _deadline,
        AccountBalanceHelper.BalanceCheckFlag _balanceCheckFlag
    )
    external;

    function getParamsForSwapTokensForExactTokens(
        address _account,
        uint256 _accountNumber,
        uint256 _amountInMaxWei,
        uint256 _amountOutWei,
        address[] calldata _tokenPath
    )
    external view returns (Account.Info[] memory, Actions.ActionArgs[] memory);

    function removeLiquidity(
        address _to,
        uint256 _toAccountNumber,
        address _tokenA,
        address _tokenB,
        uint256 _liquidity,
        uint256 _amountAMinWei,
        uint256 _amountBMinWei,
        uint256 _deadline
    ) external returns (uint256 amountAWei, uint256 amountBWei);

    function removeLiquidityWithPermit(
        address _to,
        uint256 _toAccountNumber,
        address _tokenA,
        address _tokenB,
        uint256 _liquidity,
        uint256 _amountAMinWei,
        uint256 _amountBMinWei,
        uint256 _deadline,
        PermitSignature calldata _permit
    ) external returns (uint256 amountAWei, uint256 amountBWei);

    function removeLiquidityFromWithinDolomite(
        uint256 _fromAccountIndex,
        uint256 _toAccountIndex,
        address _tokenA,
        address _tokenB,
        uint256 _liquidity,
        uint256 _amountAMinWei,
        uint256 _amountBMinWei,
        uint256 _deadline,
        AccountBalanceHelper.BalanceCheckFlag _balanceCheckFlag
    ) external returns (uint256 amountAWei, uint256 amountBWei);

    function swapExactTokensForTokensAndModifyPosition(
        ModifyPositionParams calldata _params,
        uint256 _deadline
    ) external;

    function swapTokensForExactTokensAndModifyPosition(
        ModifyPositionParams calldata _params,
        uint256 _deadline
    ) external;
}
