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


/**
 * @title   ILiquidatorAssetRegistry
 * @author  Dolomite
 *
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

    event TokenUnwrapperAddedToWhitelist(
        uint256 indexed _marketId,
        address _liquidityTokenUnwrapper
    );

    event TokenWrapperAddedToWhitelist(
        uint256 indexed _marketId,
        address _liquidityTokenWrapper
    );

    event TokenUnwrapperRemovedFromWhitelist(
        uint256 indexed _marketId,
        address _liquidityTokenUnwrapper
    );

    event TokenWrapperRemovedFromWhitelist(
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
        address _unwrapper
    ) external;

    /**
     * @param _marketId    The market ID of the asset
     * @param _wrapper     The address of the liquidity token wrapper to add
     */
    function ownerAddLiquidityTokenWrapper(
        uint256 _marketId,
        address _wrapper
    ) external;

    /**
     * @param _marketId    The market ID of the asset
     * @param _unwrapper   The address of the liquidity token unwrapper to remove
     */
    function ownerRemoveLiquidityTokenUnwrapper(
        uint256 _marketId,
        address _unwrapper
    ) external;

    /**
     * @param _marketId    The market ID of the asset
     * @param _wrapper     The address of the liquidity token wrapper to remove
     */
    function ownerRemoveLiquidityTokenWrapper(
        uint256 _marketId,
        address _wrapper
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
     * @param _marketId         The market ID of the asset whose unwrapper trader should be checked if it's added
     * @param _unwrapperTrader  The unwrapper trader for the given market ID to check
     * @return          The unwrapper trader for the asset
     */
    function isLiquidityTokenUnwrapperForAsset(
        uint256 _marketId,
        address _unwrapperTrader
    )
    external view returns (bool);

    /**
     * @notice          Reverts if the `_index` inputted is `>=` `getLiquidityTokenUnwrapperForAssetLength(_marketId)`
     *
     * @param _marketId The market ID of the asset whose unwrapper trader should be retrieved
     * @param _index    The index of the unwrapper trader in the EnumerableSet to retrieve
     * @return          The unwrapper trader for the asset at the given index
     */
    function getLiquidityTokenUnwrapperForAssetAtIndex(
        uint256 _marketId,
        uint256 _index
    )
    external view returns (address);

    /**
     * @param _marketId The market ID of the asset whose unwrapper trader should be retrieved
     * @return          The number of unwrapper traders that are enabled for the given asset
     */
    function getLiquidityTokenUnwrapperForAssetLength(
        uint256 _marketId
    )
    external view returns (uint256);


    /**
     * @param _marketId The market ID of the asset whose wrapper trader should be retrieved
     * @param _wrapperTrader  The wrapper trader for the given market ID to check
     * @return          The wrapper trader for the asset
     */
    function isLiquidityTokenWrapperForAsset(
        uint256 _marketId,
        address _wrapperTrader
    )
    external view returns (bool);

    /**
     * @notice          Reverts if the `_index` inputted is `>=` `getLiquidityTokenWrapperForAssetLength(_marketId)`
     *
     * @param _marketId The market ID of the asset whose wrapper trader should be retrieved
     * @param _index    The index of the wrapper trader in the EnumerableSet to retrieve
     * @return          The wrapper trader for the asset at the given index
     */
    function getLiquidityTokenWrapperForAssetAtIndex(
        uint256 _marketId,
        uint256 _index
    )
    external view returns (address);

    /**
     * @param _marketId The market ID of the asset whose wrapper trader should be retrieved
     * @return          The number of wrapper traders that are enabled for the given asset
     */
    function getLiquidityTokenWrapperForAssetLength(
        uint256 _marketId
    )
    external view returns (uint256);
}
