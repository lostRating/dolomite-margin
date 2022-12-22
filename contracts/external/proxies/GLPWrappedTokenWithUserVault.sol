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

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IDolomiteMargin } from "../../protocol/interfaces/IDolomiteMargin.sol";
import { ICallee } from "../../protocol/interfaces/ICallee.sol";
import { ILiquidationCallback } from "../../protocol/interfaces/ILiquidationCallback.sol";

import { Account } from "../../protocol/lib/Account.sol";
import { Actions } from "../../protocol/lib/Actions.sol";
import { Types } from "../../protocol/lib/Types.sol";
import { Require } from "../../protocol/lib/Require.sol";

import { OnlyDolomiteMargin } from "../helpers/OnlyDolomiteMargin.sol";
import { IWrappedTokenWithUserVaultFactory } from "../interfaces/IWrappedTokenWithUserVaultFactory.sol";
import { IWrappedTokenWithUserVaultProxy } from "../interfaces/IWrappedTokenWithUserVaultProxy.sol";
import { IWrappedTokenWithUserVaultV1 } from "../interfaces/IWrappedTokenWithUserVaultV1.sol";
import { AccountActionLib } from "../lib/AccountActionLib.sol";
import { AccountBalanceLib } from "../lib/AccountBalanceLib.sol";

import { WrappedTokenWithUserVaultProxy } from "./WrappedTokenWithUserVaultProxy.sol";


/**
 * @title GLPWrappedTokenWithUserVault
 * @author Dolomite
 *
 * @notice  Abstract "implementation" (for an upgradeable proxy) contract for wrapping tokens via a per-user vault that
 *          can be used with DolomiteMargin
 */
contract GLPWrappedTokenWithUserVault is
    IWrappedTokenWithUserVaultV1,
    ICallee,
    ILiquidationCallback
    {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // ============ Constants ============

    bytes32 internal constant FILE = "GLPWrappedTokenWithUserVault";

    // ============ Field Variables ============

    uint256 transferCursor;
    mapping(uint256 => uint256) public cursorToQueuedTransferAmountMap;

    // ============ Modifiers ============

    modifier onlyDolomiteMargin(address _from) {
        Require.that(
            _from == address(DOLOMITE_MARGIN()),
            FILE,
            "Only Dolomite can call function",
            _from
        );
        _;
    }

    modifier onlyVaultFactory(address _from) {
        Require.that(
            _from == address(VAULT_FACTORY()),
            FILE,
            "Only factory can call function",
            _from
        );
        _;
    }

    modifier onlyVaultOwner(address _from) {
        Require.that(
            _from == address(_proxySelf().owner()),
            FILE,
            "Only owner can call function",
            _from
        );
        _;
    }

    // ============ External Functions ============

    function depositIntoVault(
        uint256 _toAccountNumber,
        uint256 _amountWei
    )
    external
    onlyVaultOwner(msg.sender)
    {
        VAULT_FACTORY().depositIntoDolomiteMargin(_toAccountNumber, _amountWei);
    }

    function withdrawFromVault(
        uint256 _fromAccountNumber,
        uint256 _amountWei
    )
    external
    onlyVaultOwner(msg.sender) {
        VAULT_FACTORY().withdrawFromDolomiteMargin(_fromAccountNumber, _amountWei);
    }

    function transferBetweenAccountNumbers(
        uint256 _fromAccountNumber,
        uint256 _toAccountNumber,
        uint256 _amountWei
    )
    external
    onlyVaultOwner(msg.sender) {
        AccountActionLib.transfer(
            DOLOMITE_MARGIN(),
            /* _fromAccountOwner = */ address(this), // solhint-disable-line
            _fromAccountNumber,
            /* _toAccountOwner = */ address(this), // solhint-disable-line
            _toAccountNumber,
            MARKET_ID(),
            Types.AssetAmount({
                sign: false,
                denomination: Types.AssetDenomination.Wei,
                ref: _amountWei == uint(-1) ? Types.AssetReference.Target : Types.AssetReference.Delta,
                value: _amountWei == uint(-1) ? 0 : _amountWei
            }),
            AccountBalanceLib.BalanceCheckFlag.Both
        );
    }

    function executeDepositIntoVault(uint256 _amountWei) external onlyVaultFactory(msg.sender) {
        IERC20(UNDERLYING_TOKEN()).safeTransferFrom(_proxySelf().owner(), address(this), _amountWei);
    }

    function executeWithdrawalFromVault(uint256 _amountWei) external onlyVaultFactory(msg.sender) {
        IERC20(UNDERLYING_TOKEN()).safeTransfer(_proxySelf().owner(), _amountWei);
    }

    // ======== Public functions ========

    function UNDERLYING_TOKEN() public view returns (address) {
        return VAULT_FACTORY().UNDERLYING_TOKEN();
    }

    function MARKET_ID() public view returns (uint256) {
        return VAULT_FACTORY().MARKET_ID();
    }

    function DOLOMITE_MARGIN() public view returns (IDolomiteMargin) {
        return VAULT_FACTORY().DOLOMITE_MARGIN();
    }

    function VAULT_FACTORY() public view returns (IWrappedTokenWithUserVaultFactory) {
        return _proxySelf().vaultFactory();
    }

    function onLiquidate(
        uint256,
        uint256 _heldMarketId,
        Types.Wei memory _heldDeltaWei,
        uint256,
        Types.Wei memory
    )
    public
    onlyDolomiteMargin(msg.sender) {
        if (_heldMarketId == MARKET_ID()) {
            cursorToQueuedTransferAmountMap[transferCursor] = _heldDeltaWei.value;
        }
    }

    function callFunction(
        address,
        Account.Info memory accountInfo,
        bytes memory data
    )
    public
    onlyDolomiteMargin(msg.sender) {
        Require.that(
            accountInfo.owner == address(this),
            FILE,
            "Invalid account owner",
            accountInfo.owner
        );

        IDolomiteMargin dolomiteMargin = DOLOMITE_MARGIN();
        Require.that(
            dolomiteMargin.getAccountStatus(accountInfo) == Account.Status.Liquid,
            FILE,
            "Account not liquid"
        );

        // This is called after a liquidation has occurred. We need to transfer excess tokens to the liquidator's
        // designated recipient
        IERC20 token = IERC20(UNDERLYING_TOKEN());
        (address recipient) = abi.decode(data, (address));
        Require.that(
            recipient != address(0),
            FILE,
            "Invalid recipient"
        );

        uint256 transferAmount = cursorToQueuedTransferAmountMap[transferCursor++];
        Require.that(
            transferAmount > 0,
            FILE,
            "Invalid transfer"
        );

        Types.Wei memory accountWei = dolomiteMargin.getAccountWei(accountInfo, MARKET_ID());
        Require.that(
            token.balanceOf(address(this)) >= transferAmount.add(accountWei.value),
            FILE,
            "Insufficient balance"
        );
        assert(accountWei.sign);

        token.safeTransfer(recipient, transferAmount);
    }

    // ============ Internal Functions ============

    function _proxySelf() internal view returns (IWrappedTokenWithUserVaultProxy) {
        return IWrappedTokenWithUserVaultProxy(address(this));
    }
}
