/*

    Copyright 2021 Dolomite.

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


interface ITransferProxy {

    function isCallerTrusted(address _caller) external view returns (bool);

    function setIsCallerTrusted(address _caller, bool _isTrusted) external;

    function transfer(
        uint256 _fromAccountNumber,
        address _to,
        uint256 _toAccountNumber,
        address _token,
        uint256 _amountWei
    ) external;

    function transferMultiple(
        uint256 _fromAccountNumber,
        address _to,
        uint256 _toAccountNumber,
        address[] calldata _tokens,
        uint256[] calldata _amountsWei
    ) external;

    function transferMultipleWithMarkets(
        uint256 _fromAccountNumber,
        address _to,
        uint256 _toAccountNumber,
        uint256[] calldata _markets,
        uint256[] calldata _amountsWei
    ) external;
}
