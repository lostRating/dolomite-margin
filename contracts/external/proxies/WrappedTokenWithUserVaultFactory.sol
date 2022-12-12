/*

    Copyright 2021 Dolomite.

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

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Detailed } from "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IDolomiteMargin } from "../../protocol/interfaces/IDolomiteMargin.sol";

import { Account } from "../../protocol/lib/Account.sol";
import { Actions } from "../../protocol/lib/Actions.sol";
import { Types } from "../../protocol/lib/Types.sol";
import { Require } from "../../protocol/lib/Require.sol";

import { AccountActionHelper } from "../helpers/AccountActionHelper.sol";
import { OnlyDolomiteMargin } from "../helpers/OnlyDolomiteMargin.sol";

import { IWrappedTokenWithUserVaultFactory } from "../interfaces/IWrappedTokenWithUserVaultFactory.sol";


/**
 * @title WrappedTokenWithUserVaultFactory
 * @author Dolomite
 *
 * Abstract contract for wrapping tokens via a per-user vault that can be used with DolomiteMargin
 */
contract WrappedTokenWithUserVaultFactory is
    IWrappedTokenWithUserVaultFactory,
    OnlyDolomiteMargin,
    ReentrancyGuard,
    ERC20,
    ERC20Detailed {

    // ============ Constants ============

    bytes32 internal constant FILE = "WrappedTokenWithUserVaultFactory";

    // ============ Structs ============

    struct QueuedTransfer {
        address from;
        address to;
        uint256 amount;
    }

    // ============ Modifiers ============

    modifier requireIsInitialized {
        Require.that(isInitialized, FILE, "Not initialized");
        _;
    }

    // ============ Fields ============

    address public underlyingToken;
    address public isInitialized;
    address public marketId;
    uint256 public transferCursor;
    mapping(uint256 => uint256) public cursorToQueuedTransferMap;

    constructor(
        address _underlyingToken,
        address _dolomiteMargin
    ) public ERC20Detailed(
        string(abi.encodePacked("Dolomite: ", ERC20Detailed(_underlyingToken).name())),
        string(abi.encodePacked("d", ERC20Detailed(_underlyingToken).symbol())),
        ERC20Detailed(_underlyingToken).decimals()
    ) OnlyDolomiteMargin(
        _dolomiteMargin
    ) {
        underlyingToken = _underlyingToken;
    }

    function initialize() external {
        Require.that(
            !isInitialized,
            FILE,
            "Already initialized"
        );
        marketId = DOLOMITE_MARGIN.getMarketIdByTokenAddress(address(this));
        isInitialized = true;
    }

    function depositIntoDolomiteMargin(
        uint256 _accountIndex,
        uint256 _amountWei
    )
    external
    requireIsInitialized {
        cursorToQueuedTransferMap[transferCursor] = QueuedTransfer({
            from: msg.sender,
            to: address(DOLOMITE_MARGIN),
            amount: _amountWei
        });
        AccountActionHelper.deposit(
            DOLOMITE_MARGIN,
            msg.sender,
            msg.sender,
            _accountIndex,
            marketId,
            Types.AssetAmount({
                sign: true,
                denomination: Types.AssetDenomination.Wei,
                ref: Types.AssetReference.Delta,
                value: _amountWei
            })
        );
    }

    function _transfer(
        address _sender,
        address _recipient,
        uint256 _amount
    ) internal onlyDolomiteMargin {
        require(_sender != address(0), "ERC20: transfer from the zero address");
        require(_recipient != address(0), "ERC20: transfer to the zero address");
        QueuedTransfer memory queuedTransfer = cursorToQueuedTransferMap[transferCursor++];
        Require.that(
            queuedTransfer.from != address(0) && queuedTransfer.to != address(0) && queuedTransfer.amount == _amount,
            FILE,
            "Invalid queued transfer"
        );

        if (_recipient == address(DOLOMITE_MARGIN)) {
            _mint(_recipient, _amount);
        } else {
            assert(_sender == address(DOLOMITE_MARGIN));
            _burn(_sender, _amount);
        }
        emit Transfer(_sender, _recipient, _amount);
    }
}
