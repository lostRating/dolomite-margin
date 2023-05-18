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

import { ILiquidityTokenUnwrapperTrader } from "./ILiquidityTokenUnwrapperTrader.sol";
import { ILiquidityTokenWrapperTrader } from "./ILiquidityTokenWrapperTrader.sol";


/**
 * @title   ILiquidatorAssetRegistry
 * @author  Dolomite
 * @notice  Interface for a registry that tracks which assets can be liquidated and by each contract
 */
interface ILiquidatorAssetRegistry {

    // ============== Events ==============

    event LiquidatorAddedToWhitelist(
        uint256 indexed marketId,
        address indexed liquidator
    );

    event LiquidatorRemovedFromWhitelist(
        uint256 indexed marketId,
        address indexed liquidator
    );

    event TokenUnwrapperForLiquidationSet(
        uint256 indexed _marketId,
        address _liquidityTokenUnwrapper
    );

    event TokenWrapperForLiquidationSet(
        uint256 indexed _marketId,
        address _liquidityTokenWrapper
    );

    // ========== Public Functions ==========

    /**
     * @param _marketId     The market ID of the asset
     * @param _liquidator   The address of the liquidator to add
     */
    function ownerAddLiquidatorToAssetWhitelist(
        uint256 _marketId,
        address _liquidator
    )
    external;

    /**
     * @param _marketId     The market ID of the asset
     * @param _liquidator   The address of the liquidator to remove
     */
    function ownerRemoveLiquidatorFromAssetWhitelist(
        uint256 _marketId,
        address _liquidator
    )
    external;

    /**
     * @param _marketId    The market ID of the asset
     * @param _unwrapper   The address of the liquidity token unwrapper to add
     */
    function ownerAddLiquidityTokenUnwrapper(
        uint256 _marketId,
        ILiquidityTokenUnwrapperTrader _unwrapper
    ) external;

    /**
     * @param _marketId    The market ID of the asset
     * @param _wrapper     The address of the liquidity token wrapper to add
     */
    function ownerAddLiquidityTokenWrapper(
        uint256 _marketId,
        ILiquidityTokenWrapperTrader _wrapper
    ) external;

    /**
     * @param _marketId    The market ID of the asset
     * @param _unwrapper   The address of the liquidity token unwrapper to remove
     */
    function ownerRemoveLiquidityTokenUnwrapper(
        uint256 _marketId,
        ILiquidityTokenUnwrapperTrader _unwrapper
    ) external;

    /**
     * @param _marketId    The market ID of the asset
     * @param _wrapper     The address of the liquidity token wrapper to remove
     */
    function ownerRemoveLiquidityTokenWrapper(
        uint256 _marketId,
        ILiquidityTokenWrapperTrader _wrapper
    ) external;

    /**
     * @param _marketId    The market ID of the asset to check
     * @return  An array of whitelisted liquidators for the asset. An empty array is returned if any liquidator can be
     *          used for this asset
     */
    function getLiquidatorsForAsset(
        uint256 _marketId
    )
    external view returns (address[] memory);

    /**
     * @param _marketId     The market ID of the asset to check
     * @param _liquidator   The address of the liquidator to check
     * @return              True if the liquidator is whitelisted for the asset, false otherwise. Returns true if there
     *                      are no whitelisted liquidators for the asset.
     */
    function isAssetWhitelistedForLiquidation(
        uint256 _marketId,
        address _liquidator
    )
    external view returns (bool);

    /**
     * @param _marketId The market ID of the asset whose unwrapper trader should be retrieved
     * @return          The unwrapper trader for the asset
     */
    function isLiquidityTokenUnwrapperForAsset(
        uint256 _marketId,
        address _unwrapperTrader
    )
    external view returns (bool);

    /**
     * @param _marketId The market ID of the asset whose wrapper trader should be retrieved
     * @return          The wrapper trader for the asset
     */
    function isLiquidityTokenWrapperForAsset(
        uint256 _marketId,
        address _wrapperTrader
    )
    external view returns (bool);
}
