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

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IDolomiteMargin } from "../../protocol/interfaces/IDolomiteMargin.sol";

import { Actions } from "../../protocol/lib/Actions.sol";
import { DolomiteMarginMath } from "../../protocol/lib/DolomiteMarginMath.sol";
import { Require } from "../../protocol/lib/Require.sol";

import { OnlyDolomiteMargin } from "../helpers/OnlyDolomiteMargin.sol";
import { AccountActionLib } from "../lib/AccountActionLib.sol";
import { IGLPManager } from "../interfaces/IGLPManager.sol";
import { IGLPRewardRouterV2 } from "../interfaces/IGLPRewardRouterV2.sol";
import { IGMXVault } from "../interfaces/IGMXVault.sol";
import { IWrappedTokenWithUserVaultFactory } from "../interfaces/IWrappedTokenWithUserVaultFactory.sol";
import { ILiquidityTokenUnwrapperForLiquidation } from "../interfaces/ILiquidityTokenUnwrapperForLiquidation.sol";


/**
 * @title GlpUnwrapperProxy
 * @author Dolomite
 *
 * @notice  Contract for unwrapping GLP via a "redemption" to USDC
 */
contract GlpUnwrapperProxyV1 is ILiquidityTokenUnwrapperForLiquidation, OnlyDolomiteMargin {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    // ============ Constants ============

    bytes32 internal constant FILE = "GlpUnwrapperProxyV1";
    uint256 internal constant ACTIONS_LENGTH = 2;
    uint256 public constant BASIS_POINTS_DIVISOR = 10000;

    // ============ State Variables ============

    address public USDC;
    uint256 public USDC_MARKET_ID;
    IGLPManager public GLP_MANAGER;
    IGLPRewardRouterV2 public GLP_REWARD_ROUTER;
    IGMXVault public GMX_VAULT;
    IERC20 public GLP;
    IWrappedTokenWithUserVaultFactory public DS_GLP;

    // ============ Constructor ============

    constructor(
        address _usdc,
        address _glpManager,
        address _glpRewardRouter,
        address _gmxVault,
        address _glp,
        address _dsGlp,
        address _dolomiteMargin
    )
    public
    OnlyDolomiteMargin(_dolomiteMargin) {
        USDC = _usdc;
        GLP_MANAGER = IGLPManager(_glpManager);
        GLP_REWARD_ROUTER = IGLPRewardRouterV2(_glpRewardRouter);
        GMX_VAULT = IGMXVault(_gmxVault);
        GLP = IERC20(_glp);
        DS_GLP = IWrappedTokenWithUserVaultFactory(_dsGlp);

        USDC_MARKET_ID = IDolomiteMargin(_dolomiteMargin).getMarketIdByTokenAddress(_usdc);
        IERC20(_usdc).safeApprove(_dolomiteMargin, uint256(- 1));
    }

    function token() external view returns (address) {
        return address(DS_GLP);
    }

    function actionsLength() external pure returns (uint256) {
        return ACTIONS_LENGTH;
    }

    function outputMarketId() external view returns (uint256) {
        return USDC_MARKET_ID;
    }

    function createActionsForUnwrappingForLiquidation(
        uint256 _solidAccountId,
        uint256 _liquidAccountId,
        address _solidAccountOwner,
        address _liquidAccountOwner,
        uint256,
        uint256 _heldMarket,
        uint256,
        uint256 _heldAmountWithReward
    )
    external
    view
    returns (Actions.ActionArgs[] memory) {
        Actions.ActionArgs[] memory actions = new Actions.ActionArgs[](ACTIONS_LENGTH);
        // Transfer the liquidated GLP tokens to this contract
        actions[0] = AccountActionLib.encodeCallAction(
            _liquidAccountId,
            _liquidAccountOwner,
            /* _receiver[encoded] = */ abi.encode(address(this)) // solium-disable-line indentation
        );

        uint256 outputMarket = USDC_MARKET_ID;
        uint256 amountOut = getExchangeCost(
            DOLOMITE_MARGIN.getMarketTokenAddress(_heldMarket),
            DOLOMITE_MARGIN.getMarketTokenAddress(outputMarket),
            _heldAmountWithReward,
            /* _orderData = */ bytes("") // solium-disable-line indentation
        );

        actions[1] = AccountActionLib.encodeExternalSellAction(
            _solidAccountId,
            _heldMarket,
            outputMarket,
            /* _trader = */ address(this), // solium-disable-line indentation
            /* _amountInWei = */ _heldAmountWithReward, // solium-disable-line indentation
            /* _amountOutMinWei = */ amountOut, // solium-disable-line indentation
            bytes("")
        );

        return actions;
    }

    function exchange(
        address,
        address,
        address _makerToken,
        address _takerToken,
        uint256 _requestedFillAmount,
        bytes calldata _orderData
    )
    external
    onlyDolomiteMargin(msg.sender)
    returns (uint256) {
        Require.that(
            _takerToken == address(DS_GLP),
            FILE,
            "Taker token must be DS_GLP",
            _takerToken
        );
        Require.that(
            _makerToken == USDC,
            FILE,
            "Maker token must be USDC",
            _makerToken
        );

        // solium-disable indentation
        {
            uint256 balance = IERC20(DS_GLP.UNDERLYING_TOKEN()).balanceOf(address(this));
            Require.that(
                balance >= _requestedFillAmount,
                FILE,
                "Insufficient GLP for trade",
                balance
            );
        }
        // solium-enable indentation
        (uint256 minAmountOut) = abi.decode(_orderData, (uint256));

        uint256 amountOut = GLP_REWARD_ROUTER.unstakeAndRedeemGlp(
            /* _tokenOut = */ _makerToken, // solium-disable-line indentation
            /* _glpAmount = */ _requestedFillAmount, // solium-disable-line indentation
            minAmountOut,
            /* _receiver = */ address(this) // solium-disable-line indentation
        );

        return amountOut;
    }

    function getExchangeCost(
        address _makerToken,
        address _takerToken,
        uint256 _desiredMakerToken,
        bytes memory _orderData
    )
    public
    view
    returns (uint256) {
        Require.that(
            _takerToken == address(DS_GLP),
            FILE,
            "Taker token must be DS_GLP",
            _takerToken
        );
        Require.that(
            _makerToken == USDC,
            FILE,
            "Maker token must be USDC",
            _makerToken
        );
        IGMXVault gmxVault = GMX_VAULT;

        uint256 aumInUsdg = GLP_MANAGER.getAumInUsdg(false);
        uint256 glpSupply = GLP.totalSupply();
        uint256 usdgAmount = _desiredMakerToken.mul(aumInUsdg).div(glpSupply);
        uint256 redemptionAmount = gmxVault.getRedemptionAmount(_takerToken, usdgAmount);
        uint256 feeBasisPoints = gmxVault.getFeeBasisPoints(
            _makerToken,
            usdgAmount,
            gmxVault.mintBurnFeeBasisPoints(),
            gmxVault.taxBasisPoints(),
            /* _increment = */ false // solium-disable-line indentation
        );
        return _applyFees(redemptionAmount, feeBasisPoints);
    }

    // ================== Internal Functions ==================

    function _applyFees(
        uint256 _amount,
        uint256 _feeBasisPoints
    ) internal pure returns (uint256) {
        return _amount.mul(BASIS_POINTS_DIVISOR.sub(_feeBasisPoints)).div(BASIS_POINTS_DIVISOR);
    }
}
