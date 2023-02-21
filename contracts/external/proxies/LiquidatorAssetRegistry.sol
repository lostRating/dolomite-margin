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
 * @dev Registry contract for tracking which assets can be liquidated by each contract.
 */
contract LiquidatorAssetRegistry is ILiquidatorAssetRegistry, OnlyDolomiteMargin {
    using OpenZeppelinEnumerableSet for OpenZeppelinEnumerableSet.AddressSet;

    // ============ Constants ============

    bytes32 constant FILE = "OnlyDolomiteMargin";

    // ============ Storage ============

    mapping(uint256 => OpenZeppelinEnumerableSet.AddressSet) private _marketIdToLiquidatorWhitelistMap;

    // ============ Constructor ============

    constructor (
        address dolomiteMargin
    )
    public
    OnlyDolomiteMargin(dolomiteMargin)
    {}

    // ============ Modifiers ============

    modifier onlyDolomiteMarginOwner(address _from) {
        Require.that(
            _from == DOLOMITE_MARGIN.owner(),
            FILE,
            "Only Dolomite owner can call",
            _from
        );
        _;
    }

    // ============ Public Functions ============

    function addLiquidatorToAssetWhitelist(
        uint256 _marketId,
        address _liquidator
    )
    external
    onlyDolomiteMarginOwner(msg.sender) {
        _marketIdToLiquidatorWhitelistMap[_marketId].add(_liquidator);
        emit LiquidatorAddedToWhitelist(_marketId, _liquidator);
    }

    function removeLiquidatorFromAssetWhitelist(
        uint256 _marketId,
        address _liquidator
    )
    external
    onlyDolomiteMarginOwner(msg.sender) {
        _marketIdToLiquidatorWhitelistMap[_marketId].add(_liquidator);
        emit LiquidatorRemovedFromWhitelist(_marketId, _liquidator);
    }

    function isAssetWhitelistedForLiquidation(
        uint256 _marketId,
        address _liquidator
    ) external view returns (bool) {
        OpenZeppelinEnumerableSet.AddressSet storage liquidatorWhitelist = _marketIdToLiquidatorWhitelistMap[_marketId];
        return liquidatorWhitelist.length() == 0 || liquidatorWhitelist.contains(_liquidator);
    }
}
