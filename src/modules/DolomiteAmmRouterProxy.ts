// noinspection JSUnusedGlobalSymbols

import { BalanceCheckFlag, BigNumber } from '../index';
import { Contracts } from '../lib/Contracts';
import { address, AmountDenomination, AmountReference, ContractCallOptions, Integer, TxResult, } from '../types';
import { DolomiteAmmFactory } from './DolomiteAmmFactory';
import { DolomiteAmmPair } from './DolomiteAmmPair';

export interface PermitSignature {
  approveMax: boolean;
  v: string;
  r: string;
  s: string;
}

export class DolomiteAmmRouterProxy {
  public static PermitTypeHash = '0x6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c9';

  private contracts: Contracts;

  constructor(contracts: Contracts) {
    this.contracts = contracts;
  }

  public get address(): string {
    return this.contracts.dolomiteAmmRouterProxy.options.address;
  }

  // ============ View Functions ============

  public async getPairInitCodeHash(): Promise<string> {
    return this.contracts.callConstantContractFunction(
      this.contracts.dolomiteAmmRouterProxy.methods.getPairInitCodeHash()
    );
  }

  public async getDolomiteAmmAmountOut(
    amountIn: BigNumber,
    tokenIn: address,
    tokenOut: address,
  ): Promise<BigNumber> {
    return this.getDolomiteAmmAmountOutWithPath(amountIn, [tokenIn, tokenOut]);
  }

  public async getDolomiteAmmAmountOutWithPath(
    amountIn: BigNumber,
    path: address[],
  ): Promise<BigNumber> {
    const amounts = new Array<BigNumber>(path.length);
    amounts[0] = amountIn;
    const dolomiteAmmFactory = new DolomiteAmmFactory(this.contracts);

    for (let i = 0; i < path.length - 1; i += 1) {
      const pairAddress = await dolomiteAmmFactory.getPair(path[i], path[i + 1]);
      const pair = new DolomiteAmmPair(this.contracts, this.contracts.getDolomiteAmmPair(pairAddress));
      const { reserve0, reserve1 } = await pair.getReservesWei();
      const token0 = path[i] < path[i + 1] ? path[i] : path[i + 1];
      amounts[i + 1] = this.getDolomiteAmmAmountOutWithReserves(
        amounts[i],
        token0 === path[i] ? reserve0 : reserve1,
        token0 === path[i + 1] ? reserve0 : reserve1,
      );
    }

    return amounts[amounts.length - 1];
  }

  public getDolomiteAmmAmountOutWithReserves(
    amountIn: BigNumber,
    reserveIn: BigNumber,
    reserveOut: BigNumber,
  ): BigNumber {
    const amountInWithFee = amountIn.times('997');
    const numerator = amountInWithFee.times(reserveOut);
    const denominator = reserveIn.times('1000').plus(amountInWithFee);
    return numerator.dividedToIntegerBy(denominator);
  }

  public async getDolomiteAmmAmountIn(
    amountOut: BigNumber,
    tokenIn: address,
    tokenOut: address,
  ): Promise<BigNumber> {
    return this.getDolomiteAmmAmountInWithPath(amountOut, [tokenIn, tokenOut]);
  }

  public async getDolomiteAmmAmountInWithPath(
    amountOut: BigNumber,
    path: address[],
  ): Promise<BigNumber> {
    const amounts = new Array<BigNumber>(path.length);
    amounts[amounts.length - 1] = amountOut;
    const dolomiteAmmFactory = new DolomiteAmmFactory(this.contracts);

    for (let i = path.length - 1; i > 0; i -= 1) {
      const pairAddress = await dolomiteAmmFactory.getPair(path[i], path[i - 1]);
      const pair = new DolomiteAmmPair(this.contracts, this.contracts.getDolomiteAmmPair(pairAddress));
      const { reserve0, reserve1 } = await pair.getReservesWei();
      const token0 = path[i - 1] < path[i] ? path[i - 1] : path[i];
      amounts[i - 1] = this.getDolomiteAmmAmountInWithReserves(
        amounts[i],
        token0 === path[i - 1] ? reserve0 : reserve1,
        token0 === path[i] ? reserve0 : reserve1,
      );
    }

    return amounts[0];
  }

  public getDolomiteAmmAmountInWithReserves(
    amountOut: BigNumber,
    reserveIn: BigNumber,
    reserveOut: BigNumber,
  ): BigNumber {
    const numerator = reserveIn.times(amountOut).times('1000');
    const denominator = reserveOut.minus(amountOut).times('997');
    return numerator.dividedToIntegerBy(denominator).plus('1');
  }

  // ============ State-Changing Functions ============

  public async addLiquidity(
    to: address,
    accountNumber: Integer,
    tokenA: address,
    tokenB: address,
    amountADesired: Integer,
    amountBDesired: Integer,
    amountAMin: Integer,
    amountBMin: Integer,
    deadline: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.dolomiteAmmRouterProxy.methods.addLiquidity({
        tokenA,
        tokenB,
        balanceCheckFlag,
        fromAccountNumber: accountNumber.toFixed(0),
        amountADesiredWei: amountADesired.toFixed(0),
        amountBDesiredWei: amountBDesired.toFixed(0),
        amountAMinWei: amountAMin.toFixed(0),
        amountBMinWei: amountBMin.toFixed(0),
        deadline: deadline.toFixed(0),
      },
        to,
      ),
      options,
    );
  }

  public async removeLiquidity(
    to: address,
    toAccountNumber: Integer,
    tokenA: address,
    tokenB: address,
    liquidity: Integer,
    amountAMin: Integer,
    amountBMin: Integer,
    deadline: Integer,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.dolomiteAmmRouterProxy.methods.removeLiquidity(
        {
          tokenA,
          tokenB,
          toAccountNumber: toAccountNumber.toFixed(0),
          liquidityWei: liquidity.toFixed(0),
          amountAMinWei: amountAMin.toFixed(0),
          amountBMinWei: amountBMin.toFixed(0),
          deadline: deadline.toFixed(0),
        },
        to,
      ),
      options,
    );
  }

  public async removeLiquidityWithPermit(
    to: address,
    toAccountNumber: Integer,
    tokenA: address,
    tokenB: address,
    liquidity: Integer,
    amountAMin: Integer,
    amountBMin: Integer,
    deadline: Integer,
    permit: PermitSignature,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.dolomiteAmmRouterProxy.methods.removeLiquidityWithPermit(
        {
          tokenA,
          tokenB,
          toAccountNumber: toAccountNumber.toFixed(0),
          liquidityWei: liquidity.toFixed(0),
          amountAMinWei: amountAMin.toFixed(0),
          amountBMinWei: amountBMin.toFixed(0),
          deadline: deadline.toFixed(0),
        },
        to,
        permit,
      ),
      options,
    );
  }

  public async swapExactTokensForTokens(
    accountNumber: Integer,
    amountIn: Integer,
    amountOutMin: Integer,
    tokenPath: address[],
    deadline: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.dolomiteAmmRouterProxy.methods.swapExactTokensForTokens(
        accountNumber.toFixed(0),
        amountIn.toFixed(0),
        amountOutMin.toFixed(0),
        tokenPath,
        deadline.toFixed(0),
        balanceCheckFlag,
      ),
      options,
    );
  }

  public async swapExactTokensForTokensAndModifyPosition(
    fromAccountNumber: Integer,
    toAccountNumber: Integer,
    amountIn: Integer,
    amountOutMin: Integer,
    tokenPath: address[],
    depositToken: address,
    marginDeposit: Integer,
    expiryTimeDelta: Integer,
    deadline: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    const createAmount = (value: Integer) => {
      return {
        sign: true,
        denomination: AmountDenomination.Wei,
        ref: AmountReference.Delta,
        value: value.toFixed(0),
      };
    };

    return this.contracts.callContractFunction(
      this.contracts.dolomiteAmmRouterProxy.methods.swapExactTokensForTokensAndModifyPosition(
        {
          tokenPath,
          depositToken,
          balanceCheckFlag,
          fromAccountNumber: fromAccountNumber.toFixed(0),
          toAccountNumber: toAccountNumber.toFixed(0),
          amountIn: createAmount(amountIn),
          amountOut: createAmount(amountOutMin),
          marginDeposit: marginDeposit.toFixed(0),
          expiryTimeDelta: expiryTimeDelta.toFixed(0),
        },
        deadline.toFixed(0),
      ),
      options,
    );
  }

  public async swapTokensForExactTokens(
    accountNumber: Integer,
    amountInMax: Integer,
    amountOut: Integer,
    tokenPath: address[],
    deadline: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.dolomiteAmmRouterProxy.methods.swapTokensForExactTokens(
        accountNumber.toFixed(0),
        amountInMax.toFixed(0),
        amountOut.toFixed(0),
        tokenPath,
        deadline.toFixed(0),
        balanceCheckFlag,
      ),
      options,
    );
  }

  public async swapTokensForExactTokensAndModifyPosition(
    fromAccountNumber: Integer,
    toAccountNumber: Integer,
    amountInMax: Integer,
    amountOut: Integer,
    tokenPath: address[],
    depositToken: address,
    marginDeposit: Integer,
    expiryTimeDelta: Integer,
    deadline: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    const createAmount = (value: Integer) => {
      return {
        sign: true,
        denomination: AmountDenomination.Wei,
        ref: AmountReference.Delta,
        value: value.toFixed(0),
      };
    };

    return this.contracts.callContractFunction(
      this.contracts.dolomiteAmmRouterProxy.methods.swapTokensForExactTokensAndModifyPosition(
        {
          tokenPath,
          depositToken,
          balanceCheckFlag,
          fromAccountNumber: fromAccountNumber.toFixed(0),
          toAccountNumber: toAccountNumber.toFixed(0),
          amountIn: createAmount(amountInMax),
          amountOut: createAmount(amountOut),
          marginDeposit: marginDeposit.toFixed(0),
          expiryTimeDelta: expiryTimeDelta.toFixed(0),
        },
        deadline.toFixed(0),
      ),
      options,
    );
  }
}
