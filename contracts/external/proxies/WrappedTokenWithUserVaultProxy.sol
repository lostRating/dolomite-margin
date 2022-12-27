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
import { Types } from "../../protocol/lib/Types.sol";
import { Require } from "../../protocol/lib/Require.sol";

import { IWrappedTokenWithUserVaultProxy } from "../interfaces/IWrappedTokenWithUserVaultProxy.sol";
import { IWrappedTokenWithUserVaultFactory } from "../interfaces/IWrappedTokenWithUserVaultFactory.sol";


/**
 * @title WrappedTokenWithUserVault
 * @author Dolomite
 *
 * @notice  Abstract "implementation" (for an upgradeable proxy) contract for wrapping tokens via a per-user vault that
 *          can be used with DolomiteMargin
 */
contract WrappedTokenWithUserVaultProxy is
    IWrappedTokenWithUserVaultProxy
{

    // ============ Events ============

    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

    // ============ Constants ============

    bytes32 constant FILE = "WrappedTokenWithUserVaultProxy";
    bytes32 constant IS_INITIALIZED_SLOT = bytes32(uint256(keccak256("eip1967.proxy.isInitialized")) - 1);
    bytes32 constant VAULT_FACTORY_SLOT = bytes32(uint256(keccak256("eip1967.proxy.vaultFactory")) - 1);
    bytes32 constant OWNER_SLOT = bytes32(uint256(keccak256("eip1967.proxy.owner")) - 1);

    // ======== Modifiers =========

    modifier onlyOwner() {
        Require.that(msg.sender == owner(), FILE, "Caller is not the owner");
        _;
    }

    modifier requireIsInitialized() {
        Require.that(isInitialized(), FILE, "Not initialized");
        _;
    }

    // ============ Constructor ============

    constructor() public {
        _setAddress(VAULT_FACTORY_SLOT, msg.sender);
    }

    // ============ Functions ============

    function() external onlyOwner requireIsInitialized {
        address _implementation = implementation();
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            let ptr := mload(0x40)

            // (1) copy incoming call data
            calldatacopy(ptr, 0, calldatasize)

            // (2) forward call to logic contract
            let result := delegatecall(gas, _implementation, ptr, calldatasize, 0, 0)
            let size := returndatasize

            // (3) retrieve return data
            returndatacopy(ptr, 0, size)

            // (4) forward return data back to caller
            switch result
            case 0 { revert(ptr, size) }
            default { return(ptr, size) }
        }
    }

    function initialize(
        address _account
    ) external {
        Require.that(
            !isInitialized(),
            FILE,
            "Already initialized"
        );
        _setUint256(IS_INITIALIZED_SLOT, 1);
        _setAddress(OWNER_SLOT, _account);
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     */
    function transferOwnership(address _owner) external {
        Require.that(
            _owner != address(0),
            FILE,
            "new owner is the zero address"
        );
        emit OwnershipTransferred(owner(), _owner);
        _setAddress(OWNER_SLOT, _owner);
    }

    function implementation() public view returns (address) {
        return vaultFactory().userVaultImplementation();
    }

    function isInitialized() public view returns (bool) {
        return _getUint256(IS_INITIALIZED_SLOT) == 1;
    }

    function vaultFactory() public view returns (IWrappedTokenWithUserVaultFactory) {
        return IWrappedTokenWithUserVaultFactory(_getAddress(VAULT_FACTORY_SLOT));
    }

    function owner() public view returns (address) {
        return _getAddress(OWNER_SLOT);
    }

    // ================ Internal Functions ==================

    function _getAddress(bytes32 slot) internal view returns (address value) {
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            value := sload(slot)
        }
    }

    function _getUint256(bytes32 slot) internal view returns (uint256 value) {
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            value := sload(slot)
        }
    }

    function _setAddress(bytes32 slot, address _value) internal {
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            sstore(slot, _value)
        }
    }

    function _setUint256(bytes32 slot, uint256 _value) internal {
        // solium-disable-next-line security/no-inline-assembly
        assembly {
            sstore(slot, _value)
        }
    }
}
