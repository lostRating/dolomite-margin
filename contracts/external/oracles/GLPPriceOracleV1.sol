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

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { IPriceOracle } from "../../protocol/interfaces/IPriceOracle.sol";
import { Monetary } from "../../protocol/lib/Monetary.sol";
import { Require } from "../../protocol/lib/Require.sol";

import { IChainlinkAggregator } from "../interfaces/IChainlinkAggregator.sol";
import { IChainlinkAutomation } from "../interfaces/IChainlinkAutomation.sol";
import { IGLPManager } from "../interfaces/IGLPManager.sol";
import { IGMXVault } from "../interfaces/IGMXVault.sol";


/**
 * @title GLPPriceOracleV1
 * @author Dolomite
 *
 *  An implementation of the IPriceOracle interface that makes GMX's GLP prices compatible with the protocol. It uses a
 *  15-minute TWAP price of the GLP, accounting for fees and slippage.
 */
contract GLPPriceOracleV1 is IPriceOracle, IChainlinkAutomation {
    using SafeMath for uint256;

    // ============================ Events ============================
    // ============================ Events ============================

    event OraclePriceUpdated(uint256 oraclePrice, uint256 cumulativePrice);

    // ============================ Constants ============================

    bytes32 private constant FILE = "GLPPriceOracleV1";

    uint256 public constant GLP_PRECISION = 1e18;
    uint256 public constant FEE_PRECISION = 10000;
    uint256 public constant UPDATE_DURATION = 15 minutes;
    uint256 public constant EXPIRATION_DURATION = 12 hours;

    // ============================ Public State Variables ============================

    address public glpManager;
    address public gmxVault;
    address public glp;
    address public dsGlp;
    uint256 public priceCumulative;
    uint256 public lastOraclePriceUpdateTimestamp;

    // ============================ Private State Variables ============================

    uint256 private oraclePrice;

    // ============================ Modifiers ============================

    /**
     * @notice A modifier that allows it to be simulated via eth_call by checking that the sender is the zero address.
     */
    modifier cannotExecute() {
        // solium-disable security/no-tx-origin
        Require.that(
            tx.origin == address(0),
            FILE,
            "Must execute via eth_call"
        );
        // solium-enable security/no-tx-origin
        _;
    }

    // ============================ Constructor ============================

    constructor(
        address _glpManager,
        address _gmxVault,
        address _glp,
        address _dsGlp
    ) public {
        glpManager = _glpManager;
        gmxVault = _gmxVault;
        glp = _glp;
        dsGlp = _dsGlp;

        lastOraclePriceUpdateTimestamp = block.timestamp - EXPIRATION_DURATION;
    }

    function checkUpkeep(
        bytes calldata
    )
    external
    cannotExecute
    returns (bool upkeepNeeded, bytes memory /* performData */) {
        upkeepNeeded = (block.timestamp - lastOraclePriceUpdateTimestamp) >= UPDATE_DURATION;
        return (upkeepNeeded, bytes(""));
    }

    function performUpkeep(bytes calldata) external {
        uint256 timeElapsed = block.timestamp - lastOraclePriceUpdateTimestamp;
        Require.that(
            timeElapsed >= UPDATE_DURATION,
            FILE,
            "update not allowed yet"
        );


        // Enough time has passed to perform an oracle update
        uint256 priceCumulativeLast = priceCumulative;
        uint256 priceCumulativeNew = priceCumulativeLast.add(timeElapsed.mul(_getCurrentPrice()));
        uint256 oraclePriceNew = priceCumulativeNew.sub(priceCumulativeLast).div(timeElapsed);

        priceCumulative = priceCumulativeNew;
        oraclePrice = oraclePriceNew;
        lastOraclePriceUpdateTimestamp = block.timestamp;

        emit OraclePriceUpdated(oraclePriceNew, priceCumulativeNew);
    }

    function getPrice(
        address token
    )
    public
    view
    returns (Monetary.Price memory) {
        uint256 _oraclePrice = oraclePrice;
        Require.that(
            _oraclePrice != 0,
            FILE,
            "oracle price not set"
        );
        Require.that(
            token == dsGlp,
            FILE,
            "invalid token"
        );
        Require.that(
            block.timestamp.sub(lastOraclePriceUpdateTimestamp) < EXPIRATION_DURATION,
            FILE,
            "oracle price expired"
        );

        return Monetary.Price({
            value: _oraclePrice
        });
    }

    // ============================ Internal Functions ============================

    function _getCurrentPrice() internal view returns (uint256) {
        IGMXVault _gmxVault = IGMXVault(gmxVault);
        IGLPManager _glpManager = IGLPManager(glpManager);
        IERC20 _glp = IERC20(glp);

        uint256 fee = _gmxVault.mintBurnFeeBasisPoints().add(_gmxVault.taxBasisPoints());
        uint256 rawPrice = _glpManager.getAumInUsdg(false).mul(GLP_PRECISION).div(_glp.totalSupply());
        return rawPrice.sub(rawPrice.mul(fee).div(FEE_PRECISION));
    }
}
