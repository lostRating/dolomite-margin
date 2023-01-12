import { Contracts } from '../lib/Contracts';
import {
  address,
  BalanceCheckFlag,
  ContractCallOptions,
  Integer,
  TxResult,
} from '../types';
import { BorrowPositionProxyV1 } from './BorrowPositionProxyV1';

export class BorrowPositionProxyV2 extends BorrowPositionProxyV1{

  constructor(contracts: Contracts) {
    super(contracts);
  }

  public async dolomiteMargin(): Promise<address> {
    return this.contracts.callConstantContractFunction(
      this.contracts.borrowPositionProxyV2.methods.DOLOMITE_MARGIN(),
    );
  }

  public async setIsCallerAuthorized(
    caller: address,
    isAuthorized: boolean,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.borrowPositionProxyV2.methods.setIsCallerAuthorized(
        caller,
        isAuthorized,
      ),
      options,
    );
  }

  public async isCallerAuthorized(
    caller: address,
    options: ContractCallOptions = {},
  ): Promise<boolean> {
    return this.contracts.callConstantContractFunction(
      this.contracts.borrowPositionProxyV2.methods.isCallerAuthorized(caller),
      options,
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
      this.contracts.borrowPositionProxyV2.methods.openBorrowPosition(
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
      this.contracts.borrowPositionProxyV2.methods.closeBorrowPosition(
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
      this.contracts.borrowPositionProxyV2.methods.transferBetweenAccounts(
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
      this.contracts.borrowPositionProxyV2.methods.repayAllForBorrowPosition(
        fromAccountNumber.toFixed(),
        borrowAccountNumber.toFixed(),
        marketId.toFixed(),
        balanceCheckFlag,
      ),
      options,
    );
  }

  public async openBorrowPositionWithDifferentAccounts(
    fromAccountOwner: address,
    fromAccountNumber: Integer,
    toAccountOwner: address,
    toAccountNumber: Integer,
    marketId: Integer,
    amountWei: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.borrowPositionProxyV2.methods.openBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber.toFixed(),
        toAccountOwner,
        toAccountNumber.toFixed(),
        marketId.toFixed(),
        amountWei.toFixed(),
        balanceCheckFlag,
      ),
      options,
    );
  }

  public async closeBorrowPositionWithDifferentAccounts(
    borrowAccountOwner: address,
    borrowAccountNumber: Integer,
    toAccountOwner: address,
    toAccountNumber: Integer,
    marketIds: Integer[],
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.borrowPositionProxyV2.methods.closeBorrowPositionWithDifferentAccounts(
        borrowAccountOwner,
        borrowAccountNumber.toFixed(),
        toAccountOwner,
        toAccountNumber.toFixed(),
        marketIds.map(marketId => marketId.toFixed()),
      ),
      options,
    );
  }

  public async transferBetweenAccountsWithDifferentAccounts(
    fromAccountOwner: address,
    fromAccountNumber: Integer,
    toAccountOwner: address,
    toAccountNumber: Integer,
    marketId: Integer,
    amountWei: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.borrowPositionProxyV2.methods.transferBetweenAccountsWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber.toFixed(),
        toAccountOwner,
        toAccountNumber.toFixed(),
        marketId.toFixed(),
        amountWei.toFixed(),
        balanceCheckFlag,
      ),
      options,
    );
  }

  public async repayAllForBorrowPositionWithDifferentAccounts(
    fromAccountOwner: address,
    fromAccountNumber: Integer,
    borrowAccountOwner: address,
    borrowAccountNumber: Integer,
    marketId: Integer,
    balanceCheckFlag: BalanceCheckFlag,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.borrowPositionProxyV2.methods.repayAllForBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber.toFixed(),
        borrowAccountOwner,
        borrowAccountNumber.toFixed(),
        marketId.toFixed(),
        balanceCheckFlag,
      ),
      options,
    );
  }
}
