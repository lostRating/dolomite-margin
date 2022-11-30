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


interface ILiquidityTokenUnwrapper {

    /**
     * @return The liquidity token that this contract can unwrap
     */
    function token() external view returns (address);

    /**
     * @notice  Unwraps `token` to its underlying components and sends them to `msg.sender`. This contract assumes an
     *          approval of at least `_amount` in order to `safeTransferFrom(msg.sender, address(this), _amount)` the
     *          `token` into this contract for unwrapping.
     *
     * @param _amount the Amount of `token` to be unwrapped and sent to `msg.sender`.
     */
    function unwrap(uint256 _amount) external;
}
