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


interface IWrappedTokenWithUserVaultFactory {

    function UNDERLYING_TOKEN() external view returns (address);

    function MARKET_ID() external view returns (uint256);

    function DOLOMITE_MARGIN() external view returns (IDolomiteMargin);

    function createVault(address _account) external returns (address);

    /**
     * @return The address of the current vault implementation contract
     */
    function userVaultImplementation() external view returns (address);

    function setUserVaultImplementation(address _userVaultImplementation) external;

    function getVaultByUser(address _user) external view returns (address _vault);

    function getUserByVault(address _vault) external view returns (address _user);

    /**
     * @param _toAccountNumber  The account number of the account to which the tokens will be deposited
     * @param _amountWei        The amount of tokens to deposit
     */
    function depositIntoDolomiteMargin(
        uint256 _toAccountNumber,
        uint256 _amountWei
    )
    external;

    /**
     * @param _fromAccountNumber    The account number of the account from which the tokens will be withdrawn
     * @param _amountWei            The amount of tokens to withdraw
     */
    function withdrawFromDolomiteMargin(
        uint256 _fromAccountNumber,
        uint256 _amountWei
    )
    external;

    /**
     * @param _recipient    The address to which the underlying tokens will be transferred. Used for performing the
     *                      unwrapping, therefore `_recipient` should be an instance of
     *                      `ILiquidityTokenUnwrapperForLiquidation`
     * @param _amountWei    The amount of tokens to transfer to the recipient
     */
    function liquidateWithinDolomiteMargin(
        address _recipient,
        uint256 _amountWei
    )
    external;
}
