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

import { IDolomiteMargin } from "../../protocol/interfaces/IDolomiteMargin.sol";


interface IWrappedTokenWithUserVaultFactory {

    function UNDERLYING_TOKEN() external view returns (address);

    function MARKET_ID() external view returns (uint256);

    function DOLOMITE_MARGIN() external view returns (IDolomiteMargin);

    /**
     * @return The address of the current vault implementation contract
     */
    function userVaultImplementation() external view returns (address);

    function depositIntoDolomiteMargin(
        uint256 _toAccountNumber,
        uint256 _amountWei
    )
    external;

    function withdrawFromDolomiteMargin(
        uint256 _fromAccountNumber,
        uint256 _amountWei
    )
    external;
}
