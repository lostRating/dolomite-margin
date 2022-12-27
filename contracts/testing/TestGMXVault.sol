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

import { IGMXVault } from  "../external/interfaces/IGMXVault.sol";

import { IDolomiteMargin } from  "../protocol/interfaces/IDolomiteMargin.sol";


/**
 * @title TestGMXVault
 * @author Dolomite
 *
 * GMX vault used for testing the GLP price oracle. Emulates real data from GMX on Arbitrum.
 */
contract TestGMXVault is IGMXVault {

    IDolomiteMargin public DOLOMITE_MARGIN;
    address public DS_GLP;

    constructor(
        address _dolomiteMargin,
        address _dsGlp
    ) public {
        DOLOMITE_MARGIN = IDolomiteMargin(_dolomiteMargin);
        DS_GLP = _dsGlp;
    }

    function getFeeBasisPoints(
        address,
        uint256,
        uint256 _feeBasisPoints,
        uint256,
        bool
    ) external view returns (uint256) {
        return _feeBasisPoints; // simple implementation
    }

    function getRedemptionAmount(address _token, uint256 _usdgAmount) external view returns (uint256) {
        uint256 glpMarketId = DOLOMITE_MARGIN.getMarketIdByTokenAddress(DS_GLP);
        uint256 glpPrice = DOLOMITE_MARGIN.getMarketPrice(glpMarketId).value;

        uint256 tokenMarketId = DOLOMITE_MARGIN.getMarketIdByTokenAddress(_token);
        uint256 tokenPrice = DOLOMITE_MARGIN.getMarketPrice(tokenMarketId).value;

        return _usdgAmount * glpPrice / tokenPrice;
    }

    function taxBasisPoints() external view returns (uint256) {
        return 50;
    }

    function mintBurnFeeBasisPoints() external view returns (uint256) {
        return 25;
    }
}
