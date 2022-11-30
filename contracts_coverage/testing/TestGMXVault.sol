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


/**
 * @title TestGMXVault
 * @author Dolomite
 *
 * GMX vault used for testing the GLP price oracle. Emulates real data from GMX on Arbitrum.
 */
contract TestGMXVault is IGMXVault {

    function taxBasisPoints() external view returns (uint256) {
        return 50;
    }

    function mintBurnFeeBasisPoints() external view returns (uint256) {
        return 25;
    }
}
