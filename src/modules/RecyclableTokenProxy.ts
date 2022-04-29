import { Contracts } from '../lib/Contracts';
import { address, AssetAmount, ContractConstantCallOptions, Integer, TxResult, } from '../types';
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

  public async dolomiteMargin(): Promise<address> {
    return this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.DOLOMITE_MARGIN(),
    );
  }

  public async underlyingToken(): Promise<address> {
    return this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.TOKEN(),
    );
  }

  public async expiry(): Promise<address> {
    return this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.EXPIRY(),
    );
  }

  public async marketId(): Promise<Integer> {
    const result = await this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.MARKET_ID(),
    );
    return new BigNumber(result);
  }

  public async isRecycled(): Promise<boolean> {
    return this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.isRecycled(),
    );
  }

  public async name(): Promise<string> {
    return this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.name(),
    );
  }

  public async symbol(): Promise<string> {
    return this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.symbol(),
    );
  }

  public async decimals(): Promise<number> {
    const result = await this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.decimals(),
    );
    return Number(result);
  }

  public async totalSupply(): Promise<Integer> {
    const result = await this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.totalSupply(),
    );
    return new BigNumber(result);
  }

  public async balanceOf(user: address): Promise<Integer> {
    const result = await this.contracts.callConstantContractFunction(
      this.recyclableTokenProxy.methods.balanceOf(user),
    );
    return new BigNumber(result);
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
    const result = await this.contracts.callConstantContractFunction(
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
    expirationTimestamp: Integer,
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
        expirationTimestamp.toFixed(),
        isOpen,
        tradeDataBytes,
      ),
      options,
    );
  }
}
