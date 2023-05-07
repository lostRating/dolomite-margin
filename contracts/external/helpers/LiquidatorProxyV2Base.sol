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

import { Actions } from "../../protocol/lib/Actions.sol";

import { LiquidatorProxyBase } from  "./LiquidatorProxyBase.sol";


/**
 * @title LiquidatorProxyV2Base
 * @author Dolomite
 *
 * Inheritable contract that allows sharing code across liquidator V2+ proxy contracts
 */
contract LiquidatorProxyV2Base is LiquidatorProxyBase {

    // =============== Constructor ===============

    constructor(
        address _liquidatorAssetRegistry
    )
    public
    LiquidatorProxyBase(_liquidatorAssetRegistry)
    {
        // solium-disable-line no-empty-blocks
    }

    // ============ Internal Functions ============

    function _constructActionsArray(
        LiquidatorProxyConstants memory _constants,
        LiquidatorProxyCache memory _cache,
        uint256 _solidAccountId,
        uint256 _liquidAccountId
    )
        internal
        view
        returns (Actions.ActionArgs[] memory);
}
