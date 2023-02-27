import { Contracts } from '../lib/Contracts';
import { ActionArgs, address, Integer } from '../types';
import { hexStringToBytes } from '../lib/BytesHelper';
import { ILiquidityTokenUnwrapperForLiquidation } from '../../build/wrappers/ILiquidityTokenUnwrapperForLiquidation';
import BigNumber from 'bignumber.js';

export class LiquidityTokenUnwrapper {
  private contracts: Contracts;
  private unwrapper: ILiquidityTokenUnwrapperForLiquidation;

  constructor(
    contracts: Contracts,
    unwrapper: ILiquidityTokenUnwrapperForLiquidation,
  ) {
    this.contracts = contracts;
    this.unwrapper = unwrapper;
  }

  public get address(): address {
    return this.unwrapper.options.address;
  }

  public async token(): Promise<address> {
    return this.contracts.callConstantContractFunction(
      this.unwrapper.methods.token()
    );
  }

  public async actionsLength(): Promise<Integer> {
    const result = await this.contracts.callConstantContractFunction(
      this.unwrapper.methods.actionsLength()
    );
    return new BigNumber(result);
  }

  public async outputMarketId(): Promise<Integer> {
    const result = await this.contracts.callConstantContractFunction(
      this.unwrapper.methods.outputMarketId()
    );
    return new BigNumber(result);
  }

  public async createActionsForUnwrappingForLiquidation(
    solidAccountId: Integer,
    liquidAccountId: Integer,
    solidAccountOwner: address,
    liquidAccountOwner: address,
    owedMarket: Integer,
    heldMarket: Integer,
    owedAmount: Integer,
    heldAmountWithReward: Integer,
  ): Promise<ActionArgs[]> {
    return this.contracts.callConstantContractFunction(
      this.unwrapper.methods.createActionsForUnwrappingForLiquidation(
        solidAccountId.toFixed(),
        liquidAccountId.toFixed(),
        solidAccountOwner,
        liquidAccountOwner,
        owedMarket.toFixed(),
        heldMarket.toFixed(),
        owedAmount.toFixed(),
        heldAmountWithReward.toFixed(),
      )
    );
  }

  public async getExchangeCost(
    makerToken: address,
    takerToken: address,
    desiredMakerToken: Integer,
    orderData: string,
  ): Promise<address> {
    return this.contracts.callConstantContractFunction(
      this.unwrapper.methods.getExchangeCost(
        makerToken,
        takerToken,
        desiredMakerToken.toFixed(),
        hexStringToBytes(orderData),
      )
    );
  }
}
