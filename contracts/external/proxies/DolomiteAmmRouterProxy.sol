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
pragma experimental ABIEncoderV2;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

import { IDolomiteMargin } from  "../../protocol/interfaces/IDolomiteMargin.sol";

import { Account } from "../../protocol/lib/Account.sol";
import { Actions } from "../../protocol/lib/Actions.sol";
import { Events } from "../../protocol/lib/Events.sol";
import { Interest } from "../../protocol/lib/Interest.sol";
import { Require } from "../../protocol/lib/Require.sol";
import { Types } from "../../protocol/lib/Types.sol";

import { AccountActionHelper } from "../helpers/AccountActionHelper.sol";
import { AccountBalanceHelper } from "../helpers/AccountBalanceHelper.sol";
import { AccountMarginHelper } from "../helpers/AccountMarginHelper.sol";

import { TypedSignature } from "../lib/TypedSignature.sol";
import { DolomiteAmmLibrary } from "../lib/DolomiteAmmLibrary.sol";

import { IExpiry } from "../interfaces/IExpiry.sol";
import { IDolomiteAmmFactory } from "../interfaces/IDolomiteAmmFactory.sol";
import { IDolomiteAmmPair } from "../interfaces/IDolomiteAmmPair.sol";
import { IDolomiteAmmRouterProxy } from "../interfaces/IDolomiteAmmRouterProxy.sol";


/**
 * @title DolomiteAmmRouterProxy
 * @author Dolomite
 *
 * Contract for routing trades to the Dolomite AMM pools and potentially opening margin positions
 */
contract DolomiteAmmRouterProxy is IDolomiteAmmRouterProxy, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeMath for uint;

    // ==================== Constants ====================

    bytes32 constant internal FILE = "DolomiteAmmRouterProxy";

    // ==================== Modifiers ====================

    modifier ensure(uint256 deadline) {
        Require.that(
            deadline >= block.timestamp,
            FILE,
            "deadline expired",
            deadline,
            block.timestamp
        );
        _;
    }

    // ============ State Variables ============

    IDolomiteMargin public DOLOMITE_MARGIN;
    IDolomiteAmmFactory public DOLOMITE_AMM_FACTORY;
    address public EXPIRY;

    constructor(
        address _dolomiteMargin,
        address _dolomiteAmmFactory,
        address _expiry
    ) public {
        DOLOMITE_MARGIN = IDolomiteMargin(_dolomiteMargin);
        DOLOMITE_AMM_FACTORY = IDolomiteAmmFactory(_dolomiteAmmFactory);
        EXPIRY = _expiry;
    }

    function getPairInitCodeHash() external view returns (bytes32) {
        return DolomiteAmmLibrary.getPairInitCodeHash(address(DOLOMITE_AMM_FACTORY));
    }

    function addLiquidity(
        uint256 _accountNumber,
        address _to,
        address _tokenA,
        address _tokenB,
        uint256 _amountADesired,
        uint256 _amountBDesired,
        uint256 _amountAMinWei,
        uint256 _amountBMinWei,
        uint256 _deadline,
        AccountBalanceHelper.BalanceCheckFlag _balanceCheckFlag
    )
    public
    ensure(_deadline)
    returns (uint256 amountAWei, uint256 amountBWei, uint256 liquidity) {
        (amountAWei, amountBWei) = _addLiquidityCalculations(
            _tokenA,
            _tokenB,
            _amountADesired,
            _amountBDesired,
            _amountAMinWei,
            _amountBMinWei
        );
        address pair = DolomiteAmmLibrary.pairFor(address(DOLOMITE_AMM_FACTORY), _tokenA, _tokenB);

        uint256 marketIdA = DOLOMITE_MARGIN.getMarketIdByTokenAddress(_tokenA);
        uint256 marketIdB = DOLOMITE_MARGIN.getMarketIdByTokenAddress(_tokenB);

        // solium-disable indentation, arg-overflow
        {
            Account.Info[] memory accounts = new Account.Info[](2);
            accounts[0] = Account.Info(msg.sender, _accountNumber);
            accounts[1] = Account.Info(pair, 0);

            Actions.ActionArgs[] memory actions = new Actions.ActionArgs[](2);
            actions[0] = AccountActionHelper.encodeTransferAction(0, 1, marketIdA, amountAWei);
            actions[1] = AccountActionHelper.encodeTransferAction(0, 1, marketIdB, amountBWei);
            DOLOMITE_MARGIN.operate(accounts, actions);
        }
        // solium-enable indentation, arg-overflow

        liquidity = IDolomiteAmmPair(pair).mint(_to);

        if (
            _balanceCheckFlag == AccountBalanceHelper.BalanceCheckFlag.Both ||
            _balanceCheckFlag == AccountBalanceHelper.BalanceCheckFlag.From
        ) {
            AccountBalanceHelper.verifyBalanceIsNonNegative(
                DOLOMITE_MARGIN,
                msg.sender,
                _accountNumber,
                marketIdA
            );
        }
    }

    function addLiquidityAndDepositIntoDolomite(
        uint256 _fromAccountNumber,
        uint256 _toAccountNumber,
        address _tokenA,
        address _tokenB,
        uint256 _amountADesired,
        uint256 _amountBDesired,
        uint256 _amountAMinWei,
        uint256 _amountBMinWei,
        uint256 _deadline,
        AccountBalanceHelper.BalanceCheckFlag _balanceCheckFlag
    )
    external
    ensure(_deadline)
    returns (uint256 amountAWei, uint256 amountBWei, uint256 liquidity) {
        (amountAWei, amountBWei, liquidity) = addLiquidity(
            _fromAccountNumber,
            /* _to = */ address(this), // solium-disable-line indentation
            _tokenA,
            _tokenB,
            _amountADesired,
            _amountBDesired,
            _amountAMinWei,
            _amountBMinWei,
            _deadline,
            _balanceCheckFlag
        );

        IDolomiteMargin dolomiteMargin = DOLOMITE_MARGIN;
        address pair = DOLOMITE_AMM_FACTORY.getPair(_tokenA, _tokenB);
        if (IERC20(pair).allowance(address(this), address(dolomiteMargin)) < liquidity) {
            IERC20(pair).safeApprove(address(dolomiteMargin), uint256(-1));
        }

        AccountActionHelper.deposit(
            dolomiteMargin,
            msg.sender,
            address(this),
            _toAccountNumber,
            dolomiteMargin.getMarketIdByTokenAddress(pair),
            Types.AssetAmount({
                sign: true,
                denomination: Types.AssetDenomination.Wei,
                ref: Types.AssetReference.Delta,
                value: liquidity
            })
        );
    }

    function swapExactTokensForTokens(
        uint256 _accountNumber,
        uint256 _amountInWei,
        uint256 _amountOutMinWei,
        address[] calldata _tokenPath,
        uint256 _deadline,
        AccountBalanceHelper.BalanceCheckFlag _balanceCheckFlag
    )
    external
    ensure(_deadline) {
        _swapExactTokensForTokensAndModifyPosition(
            ModifyPositionCache({
                params : ModifyPositionParams({
                    fromAccountNumber : _accountNumber,
                    toAccountNumber : _accountNumber,
                    amountIn : _defaultAssetAmount(_amountInWei),
                    amountOut : _defaultAssetAmount(_amountOutMinWei),
                    tokenPath : _tokenPath,
                    depositToken : address(0),
                    marginDeposit : 0,
                    expiryTimeDelta : 0,
                    balanceCheckFlag: _balanceCheckFlag
                }),
                dolomiteMargin : DOLOMITE_MARGIN,
                ammFactory : DOLOMITE_AMM_FACTORY,
                account : msg.sender,
                marketPath : new uint[](0),
                amountsWei : new uint[](0),
                marginDepositDeltaWei : 0
            })
        );
    }

    function getParamsForSwapExactTokensForTokens(
        address account,
        uint256 accountNumber,
        uint256 amountInWei,
        uint256 amountOutMinWei,
        address[] calldata tokenPath
    )
    external view returns (Account.Info[] memory, Actions.ActionArgs[] memory) {
        return _getParamsForSwapExactTokensForTokens(
            ModifyPositionCache({
                params : ModifyPositionParams({
                    fromAccountNumber : accountNumber,
                    toAccountNumber : accountNumber,
                    amountIn : _defaultAssetAmount(amountInWei),
                    amountOut : _defaultAssetAmount(amountOutMinWei),
                    tokenPath : tokenPath,
                    depositToken : address(0),
                    marginDeposit : 0,
                    expiryTimeDelta : 0,
                    balanceCheckFlag : AccountBalanceHelper.BalanceCheckFlag.None
                }),
                dolomiteMargin : DOLOMITE_MARGIN,
                ammFactory : DOLOMITE_AMM_FACTORY,
                account : account,
                marketPath : new uint[](0),
                amountsWei : new uint[](0),
                marginDepositDeltaWei : 0
            })
        );
    }

    function swapTokensForExactTokens(
        uint256 _accountNumber,
        uint256 _amountInMaxWei,
        uint256 _amountOutWei,
        address[] calldata _tokenPath,
        uint256 _deadline,
        AccountBalanceHelper.BalanceCheckFlag _balanceCheckFlag
    )
    external
    ensure(_deadline) {
        _swapTokensForExactTokensAndModifyPosition(
            ModifyPositionCache({
                params : ModifyPositionParams({
                    fromAccountNumber : _accountNumber,
                    toAccountNumber : _accountNumber,
                    amountIn : _defaultAssetAmount(_amountInMaxWei),
                    amountOut : _defaultAssetAmount(_amountOutWei),
                    tokenPath : _tokenPath,
                    depositToken : address(0),
                    marginDeposit : 0,
                    expiryTimeDelta : 0,
                    balanceCheckFlag : _balanceCheckFlag
                }),
                dolomiteMargin : DOLOMITE_MARGIN,
                ammFactory : DOLOMITE_AMM_FACTORY,
                account : msg.sender,
                marketPath : new uint[](0),
                amountsWei : new uint[](0),
                marginDepositDeltaWei : 0
            })
        );
    }

    function getParamsForSwapTokensForExactTokens(
        address _account,
        uint256 _accountNumber,
        uint256 _amountInMaxWei,
        uint256 _amountOutWei,
        address[] calldata _tokenPath
    )
    external view returns (Account.Info[] memory, Actions.ActionArgs[] memory) {
        return _getParamsForSwapTokensForExactTokens(
            ModifyPositionCache({
                params : ModifyPositionParams({
                    fromAccountNumber : _accountNumber,
                    toAccountNumber : _accountNumber,
                    amountIn : _defaultAssetAmount(_amountInMaxWei),
                    amountOut : _defaultAssetAmount(_amountOutWei),
                    tokenPath : _tokenPath,
                    depositToken : address(0),
                    marginDeposit : 0,
                    expiryTimeDelta : 0,
                    balanceCheckFlag : AccountBalanceHelper.BalanceCheckFlag.None
                }),
                dolomiteMargin : DOLOMITE_MARGIN,
                ammFactory : DOLOMITE_AMM_FACTORY,
                account : _account,
                marketPath : new uint[](0),
                amountsWei : new uint[](0),
                marginDepositDeltaWei : 0
            })
        );
    }

    function removeLiquidity(
        address _to,
        uint256 _toAccountNumber,
        address _tokenA,
        address _tokenB,
        uint256 _liquidity,
        uint256 _amountAMinWei,
        uint256 _amountBMinWei,
        uint256 _deadline
    ) public ensure(_deadline) returns (uint256 amountAWei, uint256 amountBWei) {
        address pair = DolomiteAmmLibrary.pairFor(address(DOLOMITE_AMM_FACTORY), _tokenA, _tokenB);
        // send liquidity to pair
        IDolomiteAmmPair(pair).transferFrom(msg.sender, pair, _liquidity);

        (uint256 amount0Wei, uint256 amount1Wei) = IDolomiteAmmPair(pair).burn(_to, _toAccountNumber);
        (address token0,) = DolomiteAmmLibrary.sortTokens(_tokenA, _tokenB);
        (amountAWei, amountBWei) = _tokenA == token0 ? (amount0Wei, amount1Wei) : (amount1Wei, amount0Wei);
        Require.that(
            amountAWei >= _amountAMinWei,
            FILE,
            "insufficient A amount",
            amountAWei,
            _amountAMinWei
        );
        Require.that(
            amountBWei >= _amountBMinWei,
            FILE,
            "insufficient B amount",
            amountBWei,
            _amountBMinWei
        );
    }

    function removeLiquidityWithPermit(
        address _to,
        uint256 _toAccountNumber,
        address _tokenA,
        address _tokenB,
        uint256 _liquidity,
        uint256 _amountAMinWei,
        uint256 _amountBMinWei,
        uint256 _deadline,
        PermitSignature memory _permit
    ) public returns (uint256 amountAWei, uint256 amountBWei) {
        address pair = DolomiteAmmLibrary.pairFor(address(DOLOMITE_AMM_FACTORY), _tokenA, _tokenB);
        uint256 value = _permit.approveMax ? uint(- 1) : _liquidity;
        IDolomiteAmmPair(pair).permit(
            msg.sender,
            address(this),
            value,
            _deadline,
            _permit.v,
            _permit.r,
            _permit.s
        );

        (amountAWei, amountBWei) = removeLiquidity(
            _to,
            _toAccountNumber,
            _tokenA,
            _tokenB,
            _liquidity,
            _amountAMinWei,
            _amountBMinWei,
            _deadline
        );
    }

    function removeLiquidityFromWithinDolomite(
        uint256 _fromAccountIndex,
        uint256 _toAccountIndex,
        address _tokenA,
        address _tokenB,
        uint256 _liquidity,
        uint256 _amountAMinWei,
        uint256 _amountBMinWei,
        uint256 _deadline,
        AccountBalanceHelper.BalanceCheckFlag _balanceCheckFlag
    ) public ensure(_deadline) returns (uint256 amountAWei, uint256 amountBWei) {
        IDolomiteMargin dolomiteMargin = DOLOMITE_MARGIN;
        address pair = DolomiteAmmLibrary.pairFor(address(DOLOMITE_AMM_FACTORY), _tokenA, _tokenB);

        // send liquidity to pair
        AccountActionHelper.withdraw(
            dolomiteMargin,
            msg.sender,
            _fromAccountIndex,
            pair,
            dolomiteMargin.getMarketIdByTokenAddress(pair),
            Types.AssetAmount({
                sign: false,
                denomination: Types.AssetDenomination.Wei,
                ref: Types.AssetReference.Delta,
                value: _liquidity
            }),
            _balanceCheckFlag
        );

        (uint256 amount0Wei, uint256 amount1Wei) = IDolomiteAmmPair(pair).burn(msg.sender, _toAccountIndex);
        (address token0,) = DolomiteAmmLibrary.sortTokens(_tokenA, _tokenB);
        (amountAWei, amountBWei) = _tokenA == token0 ? (amount0Wei, amount1Wei) : (amount1Wei, amount0Wei);
        Require.that(
            amountAWei >= _amountAMinWei,
            FILE,
            "insufficient A amount",
            amountAWei,
            _amountAMinWei
        );
        Require.that(
            amountBWei >= _amountBMinWei,
            FILE,
            "insufficient B amount",
            amountBWei,
            _amountBMinWei
        );
    }

    function swapExactTokensForTokensAndModifyPosition(
        ModifyPositionParams memory _params,
        uint256 _deadline
    ) public ensure(_deadline) {
        _swapExactTokensForTokensAndModifyPosition(
            ModifyPositionCache({
                params : _params,
                dolomiteMargin : DOLOMITE_MARGIN,
                ammFactory : DOLOMITE_AMM_FACTORY,
                account : msg.sender,
                marketPath : new uint[](0),
                amountsWei : new uint[](0),
                marginDepositDeltaWei : 0
            })
        );
    }

    function swapTokensForExactTokensAndModifyPosition(
        ModifyPositionParams memory _params,
        uint256 _deadline
    ) public ensure(_deadline) {
        _swapTokensForExactTokensAndModifyPosition(
            ModifyPositionCache({
                params : _params,
                dolomiteMargin : DOLOMITE_MARGIN,
                ammFactory : DOLOMITE_AMM_FACTORY,
                account : msg.sender,
                marketPath : new uint[](0),
                amountsWei : new uint[](0),
                marginDepositDeltaWei : 0
            })
        );
    }

    // *************************
    // ***** Internal Functions
    // *************************

    function _swapExactTokensForTokensAndModifyPosition(
        ModifyPositionCache memory _cache
    ) internal {
        (
            Account.Info[] memory accounts,
            Actions.ActionArgs[] memory actions
        ) = _getParamsForSwapExactTokensForTokens(_cache);

        _cache.dolomiteMargin.operate(accounts, actions);

        _logEvents(_cache, accounts);
    }

    function _swapTokensForExactTokensAndModifyPosition(
        ModifyPositionCache memory _cache
    ) internal {
        (
            Account.Info[] memory accounts,
            Actions.ActionArgs[] memory actions
        ) = _getParamsForSwapTokensForExactTokens(_cache);

        _cache.dolomiteMargin.operate(accounts, actions);

        if (_cache.params.balanceCheckFlag == AccountBalanceHelper.BalanceCheckFlag.Both) {
            AccountBalanceHelper.verifyBalanceIsNonNegative(
                DOLOMITE_MARGIN,
                _cache.account,
                _cache.params.fromAccountNumber,
                _cache.marketPath[0]
            );
        }

        _logEvents(_cache, accounts);
    }

    function _getParamsForSwapExactTokensForTokens(
        ModifyPositionCache memory _cache
    ) internal view returns (
        Account.Info[] memory,
        Actions.ActionArgs[] memory
    ) {
        _cache.marketPath = _getMarketPathFromTokenPath(_cache);

        // Convert from par to wei, if necessary
        uint256 amountInWei = _convertAssetAmountToWei(_cache.params.amountIn, _cache.marketPath[0], _cache);

        // Convert from par to wei, if necessary
        uint256 amountOutMinWei = _convertAssetAmountToWei(
            _cache.params.amountOut,
            _cache.marketPath[_cache.marketPath.length - 1],
            _cache
        );

        // amountsWei[0] == amountInWei
        // amountsWei[amountsWei.length - 1] == amountOutWei
        _cache.amountsWei = DolomiteAmmLibrary.getAmountsOutWei(
            address(_cache.ammFactory),
            amountInWei,
            _cache.params.tokenPath
        );

        Require.that(
            _cache.amountsWei[_cache.amountsWei.length - 1] >= amountOutMinWei,
            FILE,
            "insufficient output amount",
            _cache.amountsWei[_cache.amountsWei.length - 1],
            amountOutMinWei
        );

        return _getParamsForSwap(_cache);
    }

    function _getParamsForSwapTokensForExactTokens(
        ModifyPositionCache memory _cache
    ) internal view returns (
        Account.Info[] memory,
        Actions.ActionArgs[] memory
    ) {
        _cache.marketPath = _getMarketPathFromTokenPath(_cache);

        // Convert from par to wei, if necessary
        uint256 amountInMaxWei = _convertAssetAmountToWei(_cache.params.amountIn, _cache.marketPath[0], _cache);

        // Convert from par to wei, if necessary
        uint256 amountOutWei = _convertAssetAmountToWei(
            _cache.params.amountOut,
            _cache.marketPath[_cache.marketPath.length - 1],
            _cache
        );

        // cache.amountsWei[0] == amountInWei
        // cache.amountsWei[amountsWei.length - 1] == amountOutWei
        _cache.amountsWei = DolomiteAmmLibrary.getAmountsInWei(
            address(_cache.ammFactory),
            amountOutWei,
            _cache.params.tokenPath
        );
        Require.that(
            _cache.amountsWei[0] <= amountInMaxWei,
            FILE,
            "excessive input amount",
            _cache.amountsWei[0],
            amountInMaxWei
        );

        return _getParamsForSwap(_cache);
    }

    function _getParamsForSwap(
        ModifyPositionCache memory _cache
    ) internal view returns (
        Account.Info[] memory,
        Actions.ActionArgs[] memory
    ) {
        Require.that(
            _cache.params.amountIn.ref == Types.AssetReference.Delta &&
                _cache.params.amountOut.ref == Types.AssetReference.Delta,
            FILE,
            "invalid asset reference"
        );

        // pools.length == cache.params.tokenPath.length - 1
        address[] memory pools = DolomiteAmmLibrary.getPools(address(_cache.ammFactory), _cache.params.tokenPath);

        Account.Info[] memory accounts = _getAccountsForModifyPosition(_cache, pools);
        Actions.ActionArgs[] memory actions = _getActionArgsForModifyPosition(_cache, accounts, pools);

        if (_cache.params.depositToken != address(0) && _cache.params.marginDeposit == uint(- 1)) {
            uint256 expiryActionCount = _cache.params.expiryTimeDelta == 0 ? 0 : 1;
            uint256 depositMarketId = actions[actions.length - 1 - expiryActionCount].primaryMarketId;
            if (AccountMarginHelper.isMarginAccount(_cache.params.toAccountNumber)) {
                // the user is depositing into a margin account from accounts[0] == fromAccountIndex
                // the marginDeposit is equal to the amount of `marketId` in fromAccountNumber which is at index=0
                _cache.marginDepositDeltaWei = _cache.dolomiteMargin.getAccountWei(accounts[0], depositMarketId).value;
            } else {
                // the user is withdrawing from a margin account from accounts[0] == fromAccountIndex
                if (_cache.marketPath[0] == depositMarketId) {
                    // the trade downsizes the potential withdrawal
                    _cache.marginDepositDeltaWei = _cache.dolomiteMargin.getAccountWei(
                        accounts[0],
                        depositMarketId
                    )
                    .value
                    .sub(_cache.amountsWei[0]);
                } else if (_cache.marketPath[_cache.marketPath.length - 1] == depositMarketId) {
                    // the trade upsizes the withdrawal
                    _cache.marginDepositDeltaWei = _cache.dolomiteMargin.getAccountWei(
                        accounts[0],
                        depositMarketId
                    )
                    .value
                    .add(_cache.amountsWei[_cache.amountsWei.length - 1]);
                } else {
                    // the trade doesn't impact the withdrawal
                    _cache.marginDepositDeltaWei = _cache.dolomiteMargin.getAccountWei(
                        accounts[0],
                        depositMarketId
                    )
                    .value;
                }
            }
        } else {
            _cache.marginDepositDeltaWei = _cache.params.marginDeposit;
        }

        return (accounts, actions);
    }

    function _getMarketPathFromTokenPath(
        ModifyPositionCache memory _cache
    ) internal view returns (uint[] memory) {
        uint[] memory marketPath = new uint[](_cache.params.tokenPath.length);
        for (uint256 i = 0; i < _cache.params.tokenPath.length; i++) {
            marketPath[i] = _cache.dolomiteMargin.getMarketIdByTokenAddress(_cache.params.tokenPath[i]);
        }
        return marketPath;
    }

    function _encodeExpirationAction(
        ModifyPositionParams memory _params,
        Account.Info memory _account,
        uint256 _accountIndex,
        uint256 _owedMarketId
    ) internal view returns (Actions.ActionArgs memory) {
        Require.that(
            _params.expiryTimeDelta == uint32(_params.expiryTimeDelta),
            FILE,
            "invalid expiry time"
        );

        IExpiry.SetExpiryArg[] memory expiryArgs = new IExpiry.SetExpiryArg[](1);
        expiryArgs[0] = IExpiry.SetExpiryArg({
            account : _account,
            marketId : _owedMarketId,
            timeDelta : uint32(_params.expiryTimeDelta),
            forceUpdate : true
        });

        return Actions.ActionArgs({
            actionType : Actions.ActionType.Call,
            accountId : _accountIndex,
            // solium-disable-next-line arg-overflow
            amount : Types.AssetAmount(true, Types.AssetDenomination.Wei, Types.AssetReference.Delta, 0),
            primaryMarketId : uint(- 1),
            secondaryMarketId : uint(- 1),
            otherAddress : EXPIRY,
            otherAccountId : uint(- 1),
            data : abi.encode(IExpiry.CallFunctionType.SetExpiry, expiryArgs)
        });
    }

    function _addLiquidityCalculations(
        address _tokenA,
        address _tokenB,
        uint256 _amountADesiredWei,
        uint256 _amountBDesiredWei,
        uint256 _amountAMinWei,
        uint256 _amountBMinWei
    ) internal returns (uint256 amountAWei, uint256 amountBWei) {
        IDolomiteAmmFactory dolomiteAmmFactory = DOLOMITE_AMM_FACTORY;
        // create the pair if it doesn't exist yet
        if (dolomiteAmmFactory.getPair(_tokenA, _tokenB) == address(0)) {
            dolomiteAmmFactory.createPair(_tokenA, _tokenB);
        }
        (uint256 reserveAWei, uint256 reserveBWei) = DolomiteAmmLibrary.getReservesWei(
            address(dolomiteAmmFactory),
            _tokenA,
            _tokenB
        );
        if (reserveAWei == 0 && reserveBWei == 0) {
            (amountAWei, amountBWei) = (_amountADesiredWei, _amountBDesiredWei);
        } else {
            uint256 amountBOptimal = DolomiteAmmLibrary.quote(_amountADesiredWei, reserveAWei, reserveBWei);
            if (amountBOptimal <= _amountBDesiredWei) {
                Require.that(
                    amountBOptimal >= _amountBMinWei,
                    FILE,
                    "insufficient B amount",
                    amountBOptimal,
                    _amountBMinWei
                );
                (amountAWei, amountBWei) = (_amountADesiredWei, amountBOptimal);
            } else {
                uint256 amountAOptimal = DolomiteAmmLibrary.quote(_amountBDesiredWei, reserveBWei, reserveAWei);
                assert(amountAOptimal <= _amountADesiredWei);
                Require.that(
                    amountAOptimal >= _amountAMinWei,
                    FILE,
                    "insufficient A amount",
                    amountAOptimal,
                    _amountAMinWei
                );
                (amountAWei, amountBWei) = (amountAOptimal, _amountBDesiredWei);
            }
        }
    }

    function _getAccountsForModifyPosition(
        ModifyPositionCache memory _cache,
        address[] memory _pools
    ) internal pure returns (Account.Info[] memory) {
        Account.Info[] memory accounts;
        if (_cache.params.depositToken == address(0)) {
            accounts = new Account.Info[](1 + _pools.length);
            Require.that(
                _cache.params.fromAccountNumber == _cache.params.toAccountNumber,
                FILE,
                "accounts must eq for swaps",
                _cache.params.fromAccountNumber,
                _cache.params.toAccountNumber
            );
        } else {
            accounts = new Account.Info[](2 + _pools.length);
            accounts[accounts.length - 1] = Account.Info(_cache.account, _cache.params.toAccountNumber);
            Require.that(
                _cache.params.fromAccountNumber != _cache.params.toAccountNumber,
                FILE,
                "accounts must not eq for margin",
                _cache.params.fromAccountNumber,
                _cache.params.toAccountNumber
            );
        }

        accounts[0] = Account.Info(_cache.account, _cache.params.fromAccountNumber);

        for (uint256 i = 0; i < _pools.length; i++) {
            accounts[i + 1] = Account.Info(_pools[i], 0);
        }

        return accounts;
    }

    function _getActionArgsForModifyPosition(
        ModifyPositionCache memory _cache,
        Account.Info[] memory _accounts,
        address[] memory _pools
    ) internal view returns (Actions.ActionArgs[] memory) {
        Actions.ActionArgs[] memory actions;
        if (_cache.params.depositToken == address(0)) {
            Require.that(
                _cache.params.marginDeposit == 0,
                FILE,
                "margin deposit must eq 0"
            );

            actions = new Actions.ActionArgs[](_pools.length);
        } else {
            Require.that(
                _cache.params.marginDeposit != 0,
                FILE,
                "invalid margin deposit"
            );

            uint256 expiryActionCount = _cache.params.expiryTimeDelta == 0 ? 0 : 1;
            actions = new Actions.ActionArgs[](_pools.length + 1 + expiryActionCount);

            actions[actions.length - 1 - expiryActionCount] = AccountActionHelper.encodeTransferAction(
                /* _fromAccountId */ 0, // solium-disable-line indentation
                /* _toAccountId */ _accounts.length - 1, // solium-disable-line indentation
                _cache.dolomiteMargin.getMarketIdByTokenAddress(_cache.params.depositToken),
                _cache.params.marginDeposit
            );

            if (expiryActionCount == 1) {
                actions[actions.length - 1] = _encodeExpirationAction(
                    _cache.params,
                    _accounts[_accounts.length - 1],
                    0,
                    _cache.marketPath[0] /* the market at index 0 is being borrowed and traded */
                );
            }
        }

        for (uint256 i = 0; i < _pools.length; i++) {
            Require.that(
                _accounts[i + 1].owner == _pools[i],
                FILE,
                "invalid other address"
            );
            actions[i] = AccountActionHelper.encodeTradeAction(
                _accounts.length - 1, // use toAccountId for the trade
                i + 1,
                _cache.marketPath[i],
                _cache.marketPath[i + 1],
                _pools[i],
                _cache.amountsWei[i],
                _cache.amountsWei[i + 1]
            );
        }

        return actions;
    }

    function _defaultAssetAmount(uint256 _value) internal pure returns (Types.AssetAmount memory) {
        return Types.AssetAmount({
            sign : true,
            denomination : Types.AssetDenomination.Wei,
            ref : Types.AssetReference.Delta,
            value : _value
        });
    }

    function _convertAssetAmountToWei(
        Types.AssetAmount memory _amount,
        uint256 _marketId,
        ModifyPositionCache memory _cache
    ) internal view returns (uint) {
        if (_amount.denomination == Types.AssetDenomination.Wei) {
            return _amount.value;
        } else {
            Require.that(
                uint128(_amount.value) == _amount.value,
                FILE,
                "invalid asset amount"
            );
            return Interest.parToWei(
                Types.Par({sign : _amount.sign, value : uint128(_amount.value)}),
                _cache.dolomiteMargin.getMarketCurrentIndex(_marketId)
            ).value;
        }
    }

    function _logEvents(
        ModifyPositionCache memory _cache,
        Account.Info[] memory _accounts
    ) internal {
        if (
            _cache.params.depositToken != address(0)
            && AccountMarginHelper.isMarginAccount(_cache.params.toAccountNumber)
        ) {
            Types.Par memory newOutputPar = _cache.dolomiteMargin.getAccountPar(
                _accounts[_accounts.length - 1],
                _cache.marketPath[_cache.marketPath.length - 1]
            );

            emit MarginPositionOpen(
                msg.sender,
                _cache.params.toAccountNumber,
                _cache.params.tokenPath[0],
                _cache.params.tokenPath[_cache.params.tokenPath.length - 1],
                _cache.params.depositToken,
                Events.BalanceUpdate({
                    deltaWei : Types.Wei(false, _cache.amountsWei[0]),
                    newPar : _cache.dolomiteMargin.getAccountPar(_accounts[_accounts.length - 1], _cache.marketPath[0])
                }),
                Events.BalanceUpdate({
                    deltaWei : Types.Wei(true, _cache.amountsWei[_cache.amountsWei.length - 1]),
                    newPar : newOutputPar
                }),
                Events.BalanceUpdate({
                    deltaWei : Types.Wei(true, _cache.marginDepositDeltaWei),
                    newPar : newOutputPar
                })
            );
        } else if (
            _cache.params.depositToken != address(0)
            && AccountMarginHelper.isMarginAccount(_cache.params.fromAccountNumber)
        ) {
            Types.Par memory newInputPar = _cache.dolomiteMargin.getAccountPar(_accounts[0], _cache.marketPath[0]);

            emit MarginPositionClose(
                msg.sender,
                _cache.params.fromAccountNumber,
                _cache.params.tokenPath[0],
                _cache.params.tokenPath[_cache.params.tokenPath.length - 1],
                _cache.params.depositToken,
                Events.BalanceUpdate({
                    deltaWei : Types.Wei(false, _cache.amountsWei[0]),
                    newPar : newInputPar
                }),
                Events.BalanceUpdate({
                    deltaWei : Types.Wei(true, _cache.amountsWei[_cache.amountsWei.length - 1]),
                    newPar : _getOutputPar(_cache, _accounts[0])
                }),
                Events.BalanceUpdate({
                    deltaWei : Types.Wei(false, _cache.marginDepositDeltaWei),
                    newPar : newInputPar
                })
            );
        }
    }

    function _getOutputPar(
        ModifyPositionCache memory _cache,
        Account.Info memory _account
    ) internal view returns (Types.Par memory) {
        return _cache.dolomiteMargin.getAccountPar(
            _account,
            _cache.marketPath[_cache.marketPath.length - 1]
        );
    }
}
