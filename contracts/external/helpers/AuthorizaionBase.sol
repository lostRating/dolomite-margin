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

import "./OnlyDolomiteMargin.sol";


contract AuthorizationBase is OnlyDolomiteMargin {

    // ============ State Variables ============

    mapping(address => bool) private _isCallerAuthorized;

    // ============ Modifiers ============

    modifier requireIsCallerAuthorized(address _sender) {
        Require.that(
            _isCallerAuthorized[_sender],
            FILE,
            "unauthorized"
        );
        _;
    }

    /**
     * @dev Allows or disallows the `_caller` from invoking the functions in this contract where a `fromAccount` can be
     *      manually specified.
     */
    function setIsCallerAuthorized(address _caller, bool _isAuthorized) external {
        Require.that(
            DOLOMITE_MARGIN.getIsGlobalOperator(msg.sender) || DOLOMITE_MARGIN.owner() == msg.sender,
            FILE,
            "unauthorized"
        );
        isCallerAuthorized[_caller] = _isAuthorized;
    }

    /**
     * @param The `_caller` to check if it is authorized for calling "trusted" functions
     */
    function isCallerAuthorized(address _caller) external view returns (bool) {
        return _isCallerAuthorized[_caller];
    }
}
