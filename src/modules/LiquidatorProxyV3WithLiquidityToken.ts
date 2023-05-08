import { toBytesNoPadding } from '../lib/BytesHelper';
import { Contracts } from '../lib/Contracts';
import { address, ContractCallOptions, Integer, TxResult } from '../types';

export class LiquidatorProxyV3WithLiquidityToken {
  private contracts: Contracts;

  constructor(contracts: Contracts) {
    this.contracts = contracts;
  }

  public get address(): address {
    return this.contracts.liquidatorProxyV3WithLiquidityToken.options.address;
  }

  // ============ State-Changing Functions ============

  /**
   * Liquidate liquidAccount using solidAccount. This contract and the msg.sender to this contract
   * must both be operators for the solidAccount.
   *
   * @param  solidOwner                   The address of the account that will do the liquidating
   * @param  solidNumber                  The index of the account that will do the liquidating
   * @param  liquidOwner                  The address of the account that will be liquidated
   * @param  liquidNumber                 The index of account that will be liquidated
   * @param  marketIdsForSellActionsPath  The market IDs to use for selling held market into owed market path. The
   *                                      owedMarket should be at `_marketIdsForSellActionsPath[length - 1]` and
   *                                      the heldMarket should be at `_marketIdsForSellActionsPath[0]`.
   * @param  amountWeisForSellActionsPath The amounts (in wei) to use for the sell actions. Use uint(-1) for selling
   *                                      all which sets `AssetAmount.Target=0`.
   * @param  expiry                       The time at which the position expires, if this liquidation is for closing an
   *                                      expired position. Else, 0.
   * @param trader                        The address of the trader to use for settlement of the liquidation trade.
   * @param traderCallData                The calldata to pass along to the trader for settlement of the liquidation
   *                                      trade.
   * @param options                       Additional options to be passed through to the web3 call.
   */
  public async liquidate(
    solidOwner: address,
    solidNumber: Integer,
    liquidOwner: address,
    liquidNumber: Integer,
    marketIdsForSellActionsPath: Integer[],
    amountWeisForSellActionsPath: Integer[],
    expiry: Integer | null,
    trader: address,
    traderCallData: string,
    options: ContractCallOptions = {},
  ): Promise<TxResult> {
    return this.contracts.callContractFunction(
      this.contracts.liquidatorProxyV3WithLiquidityToken.methods.liquidate(
        {
          owner: solidOwner,
          number: solidNumber.toFixed(0),
        },
        {
          owner: liquidOwner,
          number: liquidNumber.toFixed(0),
        },
        marketIdsForSellActionsPath.map(value => value.toFixed(0)),
        amountWeisForSellActionsPath.map(value => value.toFixed(0)),
        expiry ? expiry.toFixed(0) : '0',
        trader,
        toBytesNoPadding(traderCallData),
      ),
      options,
    );
  }
}
