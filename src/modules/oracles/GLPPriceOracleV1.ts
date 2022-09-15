import BigNumber from 'bignumber.js';
import { Contracts } from '../../lib/Contracts';
import { address, ContractCallOptions, ContractConstantCallOptions, Integer, TxResult, } from '../../types';

export class GLPPriceOracleV1 {
  private contracts: Contracts;

  constructor(contracts: Contracts) {
    this.contracts = contracts;
  }

  // ============ Admin ============

  public async updateOraclePrice(
    options?: ContractCallOptions,
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.glpPriceOracleV1.methods.updateOraclePrice(),
      options,
    );
  }

  // ============ Getters ============

  public async glp(
    options?: ContractConstantCallOptions,
  ): Promise<address> {
    return await this.contracts.callConstantContractFunction(
      this.contracts.glpPriceOracleV1.methods.glp(),
      options,
    );
  }

  public async getPrice(
    token: address,
    options?: ContractConstantCallOptions,
  ): Promise<Integer> {
    const price = await this.contracts.callConstantContractFunction(
      this.contracts.glpPriceOracleV1.methods.getPrice(token),
      options,
    );
    return new BigNumber(price.value);
  }

  public async priceCumulative(
    options?: ContractConstantCallOptions,
  ): Promise<Integer> {
    const rawPriceCumulative = await this.contracts.callConstantContractFunction(
      this.contracts.glpPriceOracleV1.methods.priceCumulative(),
      options,
    );
    return new BigNumber(rawPriceCumulative);
  }

  public async lastOraclePriceUpdateTimestamp(
    options?: ContractConstantCallOptions,
  ): Promise<Integer> {
    const rawLastOraclePriceUpdateTimestamp = await this.contracts.callConstantContractFunction(
      this.contracts.glpPriceOracleV1.methods.lastOraclePriceUpdateTimestamp(),
      options,
    );
    return new BigNumber(rawLastOraclePriceUpdateTimestamp);
  }
}
