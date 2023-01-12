import { Contracts } from '../lib/Contracts';
import {
  address, BalanceCheckFlag,
  ContractCallOptions,
  Integer,
  TxResult,
} from '../types';

export class BorrowPositionProxyV1 {
  protected contracts: Contracts;

  constructor(contracts: Contracts) {
    this.contracts = contracts;
  }

  // ============ View Functions ============

  public async dolomiteMargin(): Promise<address> {
    return this.contracts.callConstantContractFunction(
      this.contracts.borrowPositionProxyV1.methods.DOLOMITE_MARGIN(),
    );
  }

  public async openBorrowPosition(
    fromAccountNumber: Integer,
    toAccountNumber: Integer,
    marketId: Integer,
    amountWei: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.borrowPositionProxyV1.methods.openBorrowPosition(
        fromAccountNumber.toFixed(),
        toAccountNumber.toFixed(),
        marketId.toFixed(),
        amountWei.toFixed(),
        balanceCheckFlag,
      ),
      options,
    );
  }

  public async closeBorrowPosition(
    borrowAccountNumber: Integer,
    toAccountNumber: Integer,
    marketIds: Integer[],
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.borrowPositionProxyV1.methods.closeBorrowPosition(
        borrowAccountNumber.toFixed(),
        toAccountNumber.toFixed(),
        marketIds.map(marketId => marketId.toFixed()),
      ),
      options,
    );
  }

  public async transferBetweenAccounts(
    fromAccountNumber: Integer,
    toAccountNumber: Integer,
    marketId: Integer,
    amountWei: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.borrowPositionProxyV1.methods.transferBetweenAccounts(
        fromAccountNumber.toFixed(),
        toAccountNumber.toFixed(),
        marketId.toFixed(),
        amountWei.toFixed(),
        balanceCheckFlag,
      ),
      options,
    );
  }

  public async repayAllForBorrowPosition(
    fromAccountNumber: Integer,
    borrowAccountNumber: Integer,
    marketId: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.borrowPositionProxyV1.methods.repayAllForBorrowPosition(
        fromAccountNumber.toFixed(),
        borrowAccountNumber.toFixed(),
        marketId.toFixed(),
        balanceCheckFlag,
      ),
      options,
    );
  }
}
