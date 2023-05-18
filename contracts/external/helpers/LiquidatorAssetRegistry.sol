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

import { EnumerableSet as OpenZeppelinEnumerableSet } from "@openzeppelin/contracts/utils/EnumerableSet.sol";

import { Require } from "../../protocol/lib/Require.sol";

import { OnlyDolomiteMargin } from "../helpers/OnlyDolomiteMargin.sol";

import { ILiquidatorAssetRegistry } from "../interfaces/ILiquidatorAssetRegistry.sol";


/**
 * @title   LiquidatorAssetRegistry
 * @author  Dolomite
 *
 * @notice  A registry contract for tracking which assets can be liquidated by each contract.
 */
contract LiquidatorAssetRegistry is ILiquidatorAssetRegistry, OnlyDolomiteMargin {
    using OpenZeppelinEnumerableSet for OpenZeppelinEnumerableSet.AddressSet;

    // ============ Constants ============

    bytes32 constant FILE = "LiquidatorAssetRegistry";

    // ============ Storage ============

    mapping(uint256 => OpenZeppelinEnumerableSet.AddressSet) private _marketIdToLiquidatorWhitelistMap;
    mapping(uint256 => OpenZeppelinEnumerableSet.AddressSet) private _marketIdToUnwrapperMap;
    mapping(uint256 => OpenZeppelinEnumerableSet.AddressSet) private _marketIdToWrapperMap;

    // ============ Constructor ============

    constructor (
        address dolomiteMargin
    )
    public
    OnlyDolomiteMargin(dolomiteMargin)
    {}

    // ============ Admin Functions ============

    function ownerAddLiquidatorToAssetWhitelist(
        uint256 _marketId,
        address _liquidator
    )
    external
    onlyDolomiteMarginOwner(msg.sender) {
        Require.that(
            _liquidator != address(0),
            FILE,
            "Invalid liquidator address"
        );

        _marketIdToLiquidatorWhitelistMap[_marketId].add(_liquidator);
        emit LiquidatorAddedToWhitelist(_marketId, _liquidator);
    }

    function ownerRemoveLiquidatorFromAssetWhitelist(
        uint256 _marketId,
        address _liquidator
    )
    external
    onlyDolomiteMarginOwner(msg.sender) {
        Require.that(
            _liquidator != address(0),
            FILE,
            "Invalid liquidator address"
        );

        _marketIdToLiquidatorWhitelistMap[_marketId].remove(_liquidator);
        emit LiquidatorRemovedFromWhitelist(_marketId, _liquidator);
    }

    function ownerAddLiquidityTokenUnwrapper(
        uint256 _marketId,
        address _unwrapper
    )
    external
    onlyDolomiteMarginOwner(msg.sender) {
        Require.that(
            _unwrapper != address(0),
            FILE,
            "Invalid wrapper address"
        );

        _marketIdToUnwrapperMap[_marketId].add(_unwrapper);
        emit TokenUnwrapperAddedToWhitelist(_marketId, _unwrapper);
    }

    function ownerAddLiquidityTokenWrapper(
        uint256 _marketId,
        address _wrapper
    )
    external
    onlyDolomiteMarginOwner(msg.sender) {
        Require.that(
            _wrapper != address(0),
            FILE,
            "Invalid wrapper address"
        );

        _marketIdToWrapperMap[_marketId].add(_wrapper);
        emit TokenWrapperAddedToWhitelist(_marketId, _wrapper);
    }

    function ownerRemoveLiquidityTokenUnwrapper(
        uint256 _marketId,
        address _unwrapper
    )
    external
    onlyDolomiteMarginOwner(msg.sender) {
        Require.that(
            _unwrapper != address(0),
            FILE,
            "Invalid unwrapper address"
        );

        _marketIdToUnwrapperMap[_marketId].remove(_unwrapper);
        emit TokenUnwrapperRemovedFromWhitelist(_marketId, _unwrapper);
    }

    function ownerRemoveLiquidityTokenWrapper(
        uint256 _marketId,
        address _wrapper
    )
    external
    onlyDolomiteMarginOwner(msg.sender) {
        Require.that(
            _wrapper != address(0),
            FILE,
            "Invalid wrapper address"
        );

        _marketIdToWrapperMap[_marketId].remove(_wrapper);
        emit TokenWrapperRemovedFromWhitelist(_marketId, _wrapper);
    }

    // ============ Getter Functions ============

    function getLiquidatorsForAsset(
        uint256 _marketId
    )
    external view returns (address[] memory) {
        return _marketIdToLiquidatorWhitelistMap[_marketId].enumerate();
    }

    function isAssetWhitelistedForLiquidation(
        uint256 _marketId,
        address _liquidator
    ) external view returns (bool) {
        OpenZeppelinEnumerableSet.AddressSet storage whitelist = _marketIdToLiquidatorWhitelistMap[_marketId];
        return whitelist.length() == 0 || whitelist.contains(_liquidator);
    }

    function isLiquidityTokenUnwrapperForAsset(
        uint256 _marketId,
        address _unwrapper
    ) external view returns (bool) {
        return _marketIdToUnwrapperMap[_marketId].contains(_unwrapper);
    }

    function getLiquidityTokenUnwrapperForAssetAtIndex(
        uint256 _marketId,
        uint256 _index
    )
    external view returns (address) {
        return _marketIdToUnwrapperMap[_marketId].get(_index);
    }

    function getLiquidityTokenUnwrapperForAssetLength(
        uint256 _marketId
    )
    external view returns (uint256) {
        return _marketIdToUnwrapperMap[_marketId].length();
    }

    function isLiquidityTokenWrapperForAsset(
        uint256 _marketId,
        address _wrapper
    ) external view returns (bool) {
        return _marketIdToWrapperMap[_marketId].contains(_wrapper);
    }

    function getLiquidityTokenWrapperForAssetAtIndex(
        uint256 _marketId,
        uint256 _index
    )
    external view returns (address) {
        return _marketIdToWrapperMap[_marketId].get(_index);
    }

    function getLiquidityTokenWrapperForAssetLength(
        uint256 _marketId
    )
    external view returns (uint256) {
        return _marketIdToWrapperMap[_marketId].length();
    }
}
