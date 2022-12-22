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

import { DolomiteMarginMath } from "../../protocol/lib/DolomiteMarginMath.sol";
import { Require } from "../../protocol/lib/Require.sol";

import { OnlyDolomiteMargin } from "../helpers/OnlyDolomiteMargin.sol";
import { AccountActionLib } from "../lib/AccountActionLib.sol";
import { ERC20Lib } from "../lib/ERC20Lib.sol";
import { IGLPRewardRouterV2 } from "../interfaces/IGLPRewardRouterV2.sol";
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

    // ============ Constants ============

    bytes32 constant FILE = "GlpUnwrapperProxyV1";
    uint256 constant ACTIONS_LENGTH = 2;

    // ============ State Variables ============

    address public USDC;
    uint256 public USDC_MARKET_ID;
    IGLPRewardRouterV2 public GLP_REWARD_ROUTER;
    IWrappedTokenWithUserVaultFactory public DS_GLP;

    // ============ Constructor ============

    constructor(
        address _usdc,
        address _glpRewardRouter,
        address _dsGlp,
        address _dolomiteMargin
    )
    public
    OnlyDolomiteMargin(_dolomiteMargin) {
        USDC = _usdc;
        USDC_MARKET_ID = DOLOMITE_MARGIN.getMarketIdByTokenAddress(_usdc);
        GLP_REWARD_ROUTER = IGLPRewardRouterV2(_glpRewardRouter);
        DS_GLP = IWrappedTokenWithUserVaultFactory(_dsGlp);

        ERC20Lib.checkAllowanceAndApprove(_usdc, _dolomiteMargin, uint(-1));
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
        uint256 _owedMarket,
        uint256 _heldMarket,
        uint256 _owedAmount,
        uint256 _heldAmountWithReward
    )
    external
    returns (Actions.ActionArgs[] memory) {
        address solidAccountVault = DS_GLP.getVaultByUser(_solidAccountOwner);
        if (solidAccountVault == address(0)) {
            solidAccountVault = DS_GLP.createVault(_solidAccountOwner);
        }

        actions = new Actions.ActionArgs[](ACTIONS_LENGTH);
        actions[0] = AccountActionLib.encodeCallAction(
            _liquidAccountId,
            _liquidAccountOwner,
            /* _receiver[encoded] = */ abi.encode(solidAccountVault) // solium-disable-line indentation
        );

        uint256 outputMarket = USDC_MARKET_ID;
        uint256 amountOutMinWei;
        if (_owedMarket == outputMarket) {
            amountOutMinWei = _owedAmount;
        } else {
            // convert _owedAmount to the corresponding outputMarket amount
            amountOutMinWei = DolomiteMarginMath.getPartialRoundUp(
                _owedAmount,
                DOLOMITE_MARGIN.getMarketPrice(_owedMarket).value,
                DOLOMITE_MARGIN.getMarketPrice(outputMarket).value
            );
        }

        actions[1] = AccountActionLib.encodeExternalSellAction(
            _solidAccountId,
            _heldMarket,
            outputMarket,
            /* _trader = */ address(this), // solium-disable-line indentation
            /* _amountInWei = */ _heldAmountWithReward, // solium-disable-line indentation
            /* _amountOutMinWei = */ amountOutMinWei, // solium-disable-line indentation
            bytes("")
        );

        return (actions, outputMarket);
    }

    function exchange(
        address,
        address,
        address makerToken,
        address takerToken,
        uint256 requestedFillAmount,
        bytes calldata orderData
    )
    external
    onlyDolomiteMargin(msg.sender)
    returns (uint256) {
        Require.that(
            takerToken == address(DS_GLP),
            FILE,
            "Taker token must be DS_GLP",
            takerToken
        );
        Require.that(
            makerToken == USDC,
            FILE,
            "Taker token must be USDC",
            makerToken
        );
        (uint256 minAmountOut) = abi.decode(orderData, (uint256));

        uint256 amountOut = GLP_REWARD_ROUTER.unstakeAndRedeemGlp(
            /* _tokenOut = */ makerToken, // solium-disable-line indentation
            /* _glpAmount = */ requestedFillAmount, // solium-disable-line indentation
            minAmountOut,
            /* _receiver = */ address(this) // solium-disable-line indentation
        );

        return amountOut;
    }

    function getExchangeCost(
        address makerToken,
        address takerToken,
        uint256 desiredMakerToken,
        bytes calldata orderData
    )
    external
    view
    returns (uint256) {
        revert("GLPUnwrapperProxyV1: Not implemented");
    }
}
