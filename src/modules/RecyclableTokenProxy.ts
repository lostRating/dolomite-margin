import { Contracts } from '../lib/Contracts';
import {
  address,
  AssetAmount,
  ContractCallOptions,
  ContractConstantCallOptions,
  Integer,
  TxResult,
} from '../types';
import { RecyclableTokenProxy as RecyclableTokenProxyContract } from '../../build/wrappers/RecyclableTokenProxy';
import BigNumber from 'bignumber.js';
import { assetAmountToContractAssetAmount, valueToInteger } from '../lib/Helpers';

export class RecyclableTokenProxy {
  private contracts: Contracts;
  private recyclableTokenProxy: RecyclableTokenProxyContract;

  constructor(contracts: Contracts, recyclableToken: address) {
    this.contracts = contracts;
    this.recyclableTokenProxy = this.contracts.getRecyclableToken(recyclableToken);
  }

  public get address(): string {
    return this.recyclableTokenProxy.options.address;
  }

  // ============ View Functions ============

  public async dolomiteMargin(options: ContractConstantCallOptions = {}): Promise<address> {
    return this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.DOLOMITE_MARGIN(),
      options,
    );
  }

  public async underlyingToken(options: ContractConstantCallOptions = {}): Promise<address> {
    return this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.TOKEN(),
      options,
    );
  }

  public async expiry(options: ContractConstantCallOptions = {}): Promise<address> {
    return this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.EXPIRY(),
      options,
    );
  }

  public async marketId(options: ContractConstantCallOptions = {}): Promise<Integer> {
    const result = await this.contracts.callConstantContractFunction<string>(
      this.recyclableTokenProxy.methods.MARKET_ID(),
      options,
    );
    return new BigNumber(result);
  }

  public async isRecycled(options: ContractConstantCallOptions = {}): Promise<boolean> {
    return this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.isRecycled(),
      options,
    );
  }

  public async name(options: ContractConstantCallOptions = {}): Promise<string> {
    return this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.name(),
      options,
    );
  }

  public async symbol(options: ContractConstantCallOptions = {}): Promise<string> {
    return this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.symbol(),
      options,
    );
  }

  public async decimals(options: ContractConstantCallOptions = {}): Promise<number> {
    const result = await this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.decimals(),
      options,
    );
    return Number(result);
  }

  public async totalSupply(options: ContractConstantCallOptions = {}): Promise<Integer> {
    const result = await this.contracts.callConstantContractFunction<string>(
      this.recyclableTokenProxy.methods.totalSupply(),
      options,
    );
    return new BigNumber(result);
  }

  public async balanceOf(
    user: address,
    options: ContractConstantCallOptions = {},
  ): Promise<Integer> {
    const result = await this.contracts.callConstantContractFunction<string>(
      this.recyclableTokenProxy.methods.balanceOf(user),
      options,
    );
    return new BigNumber(result);
  }

  public async allowance(
    user: address,
    spender: address,
    options: ContractConstantCallOptions = {},
  ): Promise<Integer> {
    const result = await this.contracts.callConstantContractFunction<string>(
      this.recyclableTokenProxy.methods.allowance(user, spender),
      options,
    );
    return new BigNumber(result);
  }

  public async approve(
    user: address,
    spender: address,
    options: ContractCallOptions = {}
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.recyclableTokenProxy.methods.approve(user, spender),
      options,
    );
  }

  public async getHasUserWithdrawnAfterRecycle(
    account: address,
    accountIndex: Integer,
    options: ContractConstantCallOptions = {},
  ): Promise<boolean> {
    return this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.userToAccountNumberHasWithdrawnAfterRecycle(
        account,
        accountIndex.toFixed(),
      ),
      options,
    );
  }

  public async getAccountNumber(
    account: address,
    accountIndex: Integer,
    options: ContractConstantCallOptions = {},
  ): Promise<Integer> {
    const result = await this.contracts.callConstantContractFunction<string>(
      this.recyclableTokenProxy.methods.getAccountNumber(
        { owner: account, number: accountIndex.toFixed(), },
      ),
      options,
    );
    return new BigNumber(result);
  }

  public async getAccountPar(
    account: address,
    accountIndex: Integer,
    options: ContractConstantCallOptions = {},
  ): Promise<Integer> {
    const result = await this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.getAccountPar(
        { owner: account, number: accountIndex.toFixed(), },
      ),
      options,
    );
    return valueToInteger(result);
  }

  // ============ Write Functions ============

  public async depositIntoDolomiteMargin(
    accountIndex: Integer,
    amountPar: Integer,
    options: ContractConstantCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.recyclableTokenProxy.methods.depositIntoDolomiteMargin(
        accountIndex.toFixed(),
        amountPar.toFixed(),
      ),
      options,
    );
  }

  public async withdrawFromDolomiteMargin(
    accountIndex: Integer,
    amountPar: Integer,
    options: ContractConstantCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.recyclableTokenProxy.methods.withdrawFromDolomiteMargin(
        accountIndex.toFixed(),
        amountPar.toFixed(),
      ),
      options,
    );
  }

  public async withdrawAfterRecycle(
    accountIndex: Integer,
    options: ContractConstantCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.recyclableTokenProxy.methods.withdrawAfterRecycle(accountIndex.toFixed()),
      options,
    );
  }

  public async trade(
    accountNumber: Integer,
    supplyAmount: AssetAmount,
    borrowToken: address,
    borrowAmount: AssetAmount,
    exchangeWrapper: address,
    expiryTimeDelta: Integer,
    isOpen: boolean,
    tradeDataBytes: number[][],
    options: ContractConstantCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.recyclableTokenProxy.methods.trade(
        accountNumber.toFixed(),
        assetAmountToContractAssetAmount(supplyAmount),
        borrowToken,
        assetAmountToContractAssetAmount(borrowAmount),
        exchangeWrapper,
        expiryTimeDelta.toFixed(),
        isOpen,
        tradeDataBytes,
      ),
      options,
    );
  }
}
