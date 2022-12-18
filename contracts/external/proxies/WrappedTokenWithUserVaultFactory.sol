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

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Detailed } from "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { Create2 } from "@openzeppelin/contracts/utils/Create2.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IDolomiteMargin } from "../../protocol/interfaces/IDolomiteMargin.sol";
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

    // ============ Events ============

    event UserVaultImplementationSet(
        address indexed previousUserVaultImplementation,
        address indexed newUserVaultImplementation
    );

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

    modifier requireIsVault(address _vault) {
        Require.that(address(vaultToUserMap[_vault]) != address(0), FILE, "Caller is not a vault");
        _;
    }

    modifier onlyOwner {
        Require.that(msg.sender == DOLOMITE_MARGIN.owner(), FILE, "Caller is not the owner");
        _;
    }

    // ============ Immutable Fields ============

    address public UNDERLYING_TOKEN;
    uint256 public MARKET_ID;

    // ============ Fields ============
    address public userVaultImplementation;
    bool public isInitialized;
    uint256 public transferCursor;
    mapping(uint256 => QueuedTransfer) public cursorToQueuedTransferMap;
    mapping(address => address) public vaultToUserMap;
    mapping(address => address) public userToVaultMap;

    constructor(
        address _underlyingToken,
        address _userVaultImplementation,
        address _dolomiteMargin
    )
    public
    ERC20Detailed(
        string(abi.encodePacked("Dolomite: ", ERC20Detailed(_underlyingToken).name())),
        string(abi.encodePacked("d", ERC20Detailed(_underlyingToken).symbol())),
        ERC20Detailed(_underlyingToken).decimals()
    )
    OnlyDolomiteMargin(
        _dolomiteMargin
    ) {
        UNDERLYING_TOKEN = _underlyingToken;
        userVaultImplementation = _userVaultImplementation;
    }

    function initialize() external {
        Require.that(
            !isInitialized,
            FILE,
            "Already initialized"
        );
        MARKET_ID = DOLOMITE_MARGIN.getMarketIdByTokenAddress(address(this));
        Require.that(
            DOLOMITE_MARGIN.getMarketIsClosing(MARKET_ID),
            FILE,
            "Market cannot allow borrowing"
        );
        isInitialized = true;
    }

    function createVault(address _account) external {
        Require.that(
            userToVaultMap[_account] == address(0),
            FILE,
            "Vault already exists"
        );
        address vault = Create2.deploy(
            keccak256(abi.encodePacked(_account)),
            type(WrappedTokenWithUserVaultProxy).creationCode
        );
        vaultToUserMap[vault] = _account;
        userToVaultMap[_account] = vault;
        IWrappedTokenWithUserVaultProxy(vault).initialize(_account);
    }

    function setUserVaultImplementation(address _userVaultImplementation) external onlyOwner {
        emit UserVaultImplementationSet(userVaultImplementation, _userVaultImplementation);
        userVaultImplementation = _userVaultImplementation;
    }

    function depositIntoDolomiteMargin(
        uint256 _toAccountNumber,
        uint256 _amountWei
    )
    external
    requireIsVault(msg.sender)
    requireIsInitialized {
        cursorToQueuedTransferMap[transferCursor] = QueuedTransfer({
            from: msg.sender,
            to: address(DOLOMITE_MARGIN),
            amount: _amountWei
        });
        AccountActionLib.deposit(
            DOLOMITE_MARGIN,
            /* _accountOwner = */ msg.sender, // solium-disable-line indentation
            /* _fromAccount = */ msg.sender, // solium-disable-line indentation
            _toAccountNumber,
            MARKET_ID,
            Types.AssetAmount({
                sign: true,
                denomination: Types.AssetDenomination.Wei,
                ref: Types.AssetReference.Delta,
                value: _amountWei
            })
        );
    }

    function withdrawFromDolomiteMargin(
        uint256 _fromAccountNumber,
        uint256 _amountWei
    )
    external
    requireIsVault(msg.sender)
    requireIsInitialized {
        cursorToQueuedTransferMap[transferCursor] = QueuedTransfer({
            from: address(DOLOMITE_MARGIN),
            to: msg.sender,
            amount: _amountWei
        });
        AccountActionLib.withdraw(
            DOLOMITE_MARGIN,
            /* _accountOwner = */ msg.sender, // solium-disable-line indentation
            _fromAccountNumber,
            /* _toAccount = */ msg.sender, // solium-disable-line indentation
            MARKET_ID,
            Types.AssetAmount({
                sign: true,
                denomination: Types.AssetDenomination.Wei,
                ref: Types.AssetReference.Delta,
                value: _amountWei
            }),
            AccountBalanceLib.BalanceCheckFlag.From
        );
    }

    function _transfer(
        address _from,
        address _to,
        uint256 _amount
    )
    internal
    onlyDolomiteMargin(msg.sender) {
        Require.that(
            _from != address(0),
            FILE,
            "Transfer from the zero address"
        );
        Require.that(
            _to != address(0),
            FILE,
            "Transfer to the zero address"
        );

        // Since this must be called from DolomiteMargin via Exchange#transferIn/Exchange#transferOut, we can assume
        // that it's non-reentrant
        address dolomiteMargin = address(DOLOMITE_MARGIN);
        Require.that(
            _from == dolomiteMargin || _to == dolomiteMargin,
            FILE,
            "from/to must eq DolomiteMargin"
        );

        QueuedTransfer memory queuedTransfer = cursorToQueuedTransferMap[transferCursor++];
        Require.that(
            queuedTransfer.from == _from && queuedTransfer.to == _to && queuedTransfer.amount == _amount,
            FILE,
            "Invalid queued transfer"
        );

        if (_to == dolomiteMargin) {
            // transfers TO DolomiteMargin must be made FROM a vault
            Require.that(
                vaultToUserMap[_from] != address(0),
                FILE,
                "Invalid from"
            );
            IWrappedTokenWithUserVaultV1(_from).executeDepositIntoVault(_amount);
        } else {
            // transfers FROM DolomiteMargin must be made TO a vault
            Require.that(
                vaultToUserMap[_to] != address(0),
                FILE,
                "Invalid to"
            );
            IWrappedTokenWithUserVaultV1(_to).executeWithdrawalFromVault(_amount);
        }
        emit Transfer(_from, _to, _amount);
    }
}
