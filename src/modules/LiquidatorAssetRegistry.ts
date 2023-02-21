import { Contracts } from '../lib/Contracts';
import { address, Integer, } from '../types';

export class LiquidatorAssetRegistry {
  private contracts: Contracts;

  constructor(contracts: Contracts) {
    this.contracts = contracts;
  }

  // ============ State-Changing Functions ============

  public async addLiquidatorToAssetWhitelist(
    marketId: Integer,
    liquidatorProxy: address,
  ) {
    return this.contracts.callContractFunction(
      this.contracts.liquidatorAssetRegistry.methods.addLiquidatorToAssetWhitelist(
        marketId.toFixed(0),
        liquidatorProxy,
      ),
    );
  }

  public async removeLiquidatorFromAssetWhitelist(
    marketId: Integer,
    liquidatorProxy: address,
  ) {
    return this.contracts.callContractFunction(
      this.contracts.liquidatorAssetRegistry.methods.removeLiquidatorFromAssetWhitelist(
        marketId.toFixed(0),
        liquidatorProxy,
      ),
    );
  }

  // ============ Getter Functions ============

  public async isAssetWhitelistedForLiquidation(
    marketId: Integer,
    liquidatorProxy: address,
  ) {
    return this.contracts.callConstantContractFunction(
      this.contracts.liquidatorAssetRegistry.methods.isAssetWhitelistedForLiquidation(
        marketId.toFixed(0),
        liquidatorProxy,
      ),
    );
  }

}
