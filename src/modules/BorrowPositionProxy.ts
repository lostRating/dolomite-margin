import { Contracts } from '../lib/Contracts';
import {
  address, BalanceCheckFlag,
  ContractCallOptions,
  Integer,
  TxResult,
} from '../types';

export class BorrowPositionProxy {
  private contracts: Contracts;

  constructor(contracts: Contracts) {
    this.contracts = contracts;
  }

  // ============ View Functions ============

  public async dolomiteMargin(): Promise<address> {
    return this.contracts.callConstantContractFunction(
      this.contracts.transferProxy.methods.DOLOMITE_MARGIN(),
    );
  }

  public async openBorrowPosition(
    fromAccountIndex: Integer,
    toAccountIndex: Integer,
    marketId: Integer,
    amountWei: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.borrowPositionProxy.methods.openBorrowPosition(
        fromAccountIndex.toFixed(),
        toAccountIndex.toFixed(),
        marketId.toFixed(),
        amountWei.toFixed(),
        balanceCheckFlag,
      ),
      options,
    );
  }

  public async closeBorrowPosition(
    borrowAccountIndex: Integer,
    toAccountIndex: Integer,
    marketIds: Integer[],
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.borrowPositionProxy.methods.closeBorrowPosition(
        borrowAccountIndex.toFixed(),
        toAccountIndex.toFixed(),
        marketIds.map(marketId => marketId.toFixed()),
      ),
      options,
    );
  }

  public async transferBetweenAccounts(
    fromAccountIndex: Integer,
    toAccountIndex: Integer,
    marketId: Integer,
    amountWei: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.borrowPositionProxy.methods.transferBetweenAccounts(
        fromAccountIndex.toFixed(),
        toAccountIndex.toFixed(),
        marketId.toFixed(),
        amountWei.toFixed(),
        balanceCheckFlag,
      ),
      options,
    );
  }

  public async repayAllForBorrowPosition(
    fromAccountIndex: Integer,
    borrowAccountIndex: Integer,
    marketId: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.borrowPositionProxy.methods.repayAllForBorrowPosition(
        fromAccountIndex.toFixed(),
        borrowAccountIndex.toFixed(),
        marketId.toFixed(),
        balanceCheckFlag,
      ),
      options,
    );
  }
}
