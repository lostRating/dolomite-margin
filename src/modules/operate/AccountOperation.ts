import BigNumber from 'bignumber.js';
import { TransactionObject } from 'web3/eth/types';
import {
  addressesAreEqual,
  bytesToHexString,
  hexStringToBytes,
  toBytes,
} from '../../lib/BytesHelper';
import {
  ADDRESSES,
  INTEGERS,
} from '../../lib/Constants';
import { Contracts } from '../../lib/Contracts';
import expiryConstants from '../../lib/expiry-constants.json';
import { toNumber } from '../../lib/Helpers';
import {
  AccountAction,
  AccountInfo,
  AccountOperationOptions,
  Action,
  ActionArgs,
  ActionType,
  address,
  Amount,
  AmountDenomination,
  AmountReference,
  Buy,
  Call,
  ConfirmationType,
  ContractCallOptions,
  Deposit,
  Exchange,
  ExpiryCallFunctionType,
  Integer,
  Liquidate,
  Operation,
  OperationAuthorization,
  ProxyType,
  Sell,
  SetApprovalForExpiry,
  SetExpiry,
  SignedOperation,
  Trade,
  Transfer,
  TxResult,
  Vaporize,
  Withdraw,
} from '../../types';
import { OrderMapper } from '../OrderMapper';

interface OptionalActionArgs {
  actionType: number | string;
  primaryMarketId?: number | string;
  secondaryMarketId?: number | string;
  otherAddress?: string;
  otherAccountId?: number;
  data?: (string | number[])[];
  amount?: Amount;
}

export class AccountOperation {
  private contracts: Contracts;
  private actions: ActionArgs[];
  private committed: boolean;
  private orderMapper: OrderMapper;
  private accounts: AccountInfo[];
  private proxy: ProxyType;
  private sendEthTo: address;
  private auths: OperationAuthorization[];
  private networkId: number;

  constructor(
    contracts: Contracts,
    orderMapper: OrderMapper,
    networkId: number,
    options: AccountOperationOptions,
  ) {
    // use the passed-in proxy type, but support the old way of passing in `usePayableProxy = true`
    const proxy = options.proxy || ProxyType.None;

    this.contracts = contracts;
    this.actions = [];
    this.committed = false;
    this.orderMapper = orderMapper;
    this.accounts = [];
    this.proxy = proxy;
    this.sendEthTo = options.sendEthTo;
    this.auths = [];
    this.networkId = networkId;
  }

  public deposit(deposit: Deposit): AccountOperation {
    this.addActionArgs(deposit, {
      actionType: ActionType.Deposit,
      amount: deposit.amount,
      otherAddress: deposit.from,
      primaryMarketId: deposit.marketId.toFixed(0),
    });

    return this;
  }

  public withdraw(withdraw: Withdraw): AccountOperation {
    this.addActionArgs(withdraw, {
      amount: withdraw.amount,
      actionType: ActionType.Withdraw,
      otherAddress: withdraw.to,
      primaryMarketId: withdraw.marketId.toFixed(0),
    });

    return this;
  }

  public transfer(transfer: Transfer): AccountOperation {
    this.addActionArgs(transfer, {
      actionType: ActionType.Transfer,
      amount: transfer.amount,
      primaryMarketId: transfer.marketId.toFixed(0),
      otherAccountId: this.getAccountId(
        transfer.toAccountOwner,
        transfer.toAccountId,
      ),
    });

    return this;
  }

  public buy(buy: Buy): AccountOperation {
    return this.exchange(buy, ActionType.Buy);
  }

  public sell(sell: Sell): AccountOperation {
    return this.exchange(sell, ActionType.Sell);
  }

  public liquidate(liquidate: Liquidate): AccountOperation {
    this.addActionArgs(liquidate, {
      actionType: ActionType.Liquidate,
      amount: liquidate.amount,
      primaryMarketId: liquidate.liquidMarketId.toFixed(0),
      secondaryMarketId: liquidate.payoutMarketId.toFixed(0),
      otherAccountId: this.getAccountId(
        liquidate.liquidAccountOwner,
        liquidate.liquidAccountId,
      ),
    });

    return this;
  }

  public vaporize(vaporize: Vaporize): AccountOperation {
    this.addActionArgs(vaporize, {
      actionType: ActionType.Vaporize,
      amount: vaporize.amount,
      primaryMarketId: vaporize.vaporMarketId.toFixed(0),
      secondaryMarketId: vaporize.payoutMarketId.toFixed(0),
      otherAccountId: this.getAccountId(
        vaporize.vaporAccountOwner,
        vaporize.vaporAccountId,
      ),
    });

    return this;
  }

  public setApprovalForExpiry(
    args: SetApprovalForExpiry,
  ): AccountOperation {
    this.addActionArgs(args, {
      actionType: ActionType.Call,
      otherAddress: this.contracts.expiry.options.address,
      data: toBytes(
        ExpiryCallFunctionType.SetApproval,
        args.sender,
        args.minTimeDelta,
      ),
    });

    return this;
  }

  public setExpiry(args: SetExpiry): AccountOperation {
    let callData = toBytes(ExpiryCallFunctionType.SetExpiry);
    callData = callData.concat(toBytes(new BigNumber(64)));
    callData = callData.concat(
      toBytes(new BigNumber(args.expiryArgs.length)),
    );
    for (let i = 0; i < args.expiryArgs.length; i += 1) {
      const expiryArg = args.expiryArgs[i];
      callData = callData.concat(
        toBytes(
          expiryArg.accountOwner,
          expiryArg.accountId,
          expiryArg.marketId,
          expiryArg.timeDelta,
          expiryArg.forceUpdate,
        ),
      );
    }
    this.addActionArgs(args, {
      actionType: ActionType.Call,
      otherAddress: this.contracts.expiry.options.address,
      data: callData,
    });

    return this;
  }

  public call(args: Call): AccountOperation {
    this.addActionArgs(args, {
      actionType: ActionType.Call,
      otherAddress: args.callee,
      data: args.data,
    });

    return this;
  }

  public trade(trade: Trade): AccountOperation {
    this.addActionArgs(trade, {
      actionType: ActionType.Trade,
      amount: trade.amount,
      primaryMarketId: trade.inputMarketId.toFixed(0),
      secondaryMarketId: trade.outputMarketId.toFixed(0),
      otherAccountId: this.getAccountId(
        trade.otherAccountOwner,
        trade.otherAccountId,
      ),
      otherAddress: trade.autoTrader,
      data: trade.data,
    });

    return this;
  }

  public liquidateExpiredAccount(
    liquidate: Liquidate,
    maxExpiry?: Integer,
  ): AccountOperation {
    return this.liquidateExpiredAccountInternal(
      liquidate,
      maxExpiry || INTEGERS.ONES_31,
      this.contracts.expiry.options.address,
    );
  }

  public fullyLiquidateExpiredAccount(
    primaryAccountOwner: address,
    primaryAccountNumber: Integer,
    expiredAccountOwner: address,
    expiredAccountNumber: Integer,
    expiredMarket: Integer,
    expiryTimestamp: Integer,
    blockTimestamp: Integer,
    weis: { [marketId: string]: Integer },
    prices: { [marketId: string]: Integer },
    spreadPremiums: { [marketId: string]: Integer },
    collateralPreferences: Integer[],
  ): AccountOperation {
    return this.fullyLiquidateExpiredAccountInternal(
      primaryAccountOwner,
      primaryAccountNumber,
      expiredAccountOwner,
      expiredAccountNumber,
      expiredMarket,
      expiryTimestamp,
      blockTimestamp,
      weis,
      prices,
      spreadPremiums,
      collateralPreferences,
      this.contracts.expiry.options.address,
    );
  }

  /**
   * Adds all actions from a SignedOperation and also adds the authorization object that allows the
   * proxy to process the actions.
   */
  public addSignedOperation(
    signedOperation: SignedOperation,
  ): AccountOperation {
    // throw error if operation is not going to use the signed proxy
    if (this.proxy !== ProxyType.Signed) {
      throw new Error(
        'Cannot add signed operation if not using signed operation proxy',
      );
    }

    // store the auth
    this.auths.push({
      startIndex: new BigNumber(this.actions.length),
      numActions: new BigNumber(signedOperation.actions.length),
      salt: signedOperation.salt,
      expiration: signedOperation.expiration,
      sender: signedOperation.sender,
      signer: signedOperation.signer,
      typedSignature: signedOperation.typedSignature,
    });

    // store the actions
    for (let i = 0; i < signedOperation.actions.length; i += 1) {
      const action = signedOperation.actions[i];

      const secondaryAccountId =
        action.secondaryAccountOwner === ADDRESSES.ZERO
          ? 0
          : this.getAccountId(
            action.secondaryAccountOwner,
            action.secondaryAccountNumber,
          );

      this.addActionArgs(
        {
          primaryAccountOwner: action.primaryAccountOwner,
          primaryAccountId: action.primaryAccountNumber,
        },
        {
          actionType: action.actionType,
          primaryMarketId: action.primaryMarketId.toFixed(0),
          secondaryMarketId: action.secondaryMarketId.toFixed(0),
          otherAddress: action.otherAddress,
          otherAccountId: secondaryAccountId,
          data: hexStringToBytes(action.data),
          amount: {
            reference: action.amount.ref,
            denomination: action.amount.denomination,
            value: action.amount.value.times(action.amount.sign ? 1 : -1),
          },
        },
      );
    }

    return this;
  }

  /**
   * Takes all current actions/accounts and creates an Operation struct that can then be signed and
   * later used with the SignedOperationProxy.
   */
  public createSignableOperation(
    options: {
      expiration?: Integer;
      salt?: Integer;
      sender?: address;
      signer?: address;
    } = {},
  ): Operation {
    if (this.auths.length) {
      throw new Error('Cannot create operation out of operation with auths');
    }
    if (!this.actions.length) {
      throw new Error(
        'Cannot create operation out of operation with no actions',
      );
    }

    const actionArgsToAction = (action: ActionArgs): Action => {
      const secondaryAccount: AccountInfo =
        action.actionType === ActionType.Transfer ||
        action.actionType === ActionType.Trade ||
        action.actionType === ActionType.Liquidate ||
        action.actionType === ActionType.Vaporize
          ? this.accounts[action.otherAccountId]
          : { owner: ADDRESSES.ZERO, number: '0' };

      return {
        actionType: toNumber(action.actionType),
        primaryAccountOwner: this.accounts[action.accountId].owner,
        primaryAccountNumber: new BigNumber(
          this.accounts[action.accountId].number,
        ),
        secondaryAccountOwner: secondaryAccount.owner,
        secondaryAccountNumber: new BigNumber(secondaryAccount.number),
        primaryMarketId: new BigNumber(action.primaryMarketId),
        secondaryMarketId: new BigNumber(action.secondaryMarketId),
        amount: {
          sign: action.amount.sign,
          ref: toNumber(action.amount.ref),
          denomination: toNumber(action.amount.denomination),
          value: new BigNumber(action.amount.value),
        },
        otherAddress: action.otherAddress,
        data: bytesToHexString(action.data),
      };
    };

    const actions: Action[] = this.actions.map(actionArgsToAction.bind(this));

    return {
      actions,
      expiration: options.expiration || INTEGERS.ZERO,
      salt: options.salt || INTEGERS.ZERO,
      sender: options.sender || ADDRESSES.ZERO,
      signer: options.signer || this.accounts[0].owner,
    };
  }

  /**
   * Commits the operation to the chain by sending a transaction.
   */
  public async commit(options?: ContractCallOptions): Promise<TxResult> {
    if (this.committed) {
      throw new Error('Operation already committed');
    }
    if (this.actions.length === 0) {
      throw new Error('No actions have been added to operation');
    }

    if (options && options.confirmationType !== ConfirmationType.Simulate) {
      this.committed = true;
    }

    try {
      let method: TransactionObject<void>;

      switch (this.proxy) {
        case ProxyType.None:
          method = this.contracts.dolomiteMargin.methods.operate(
            this.accounts,
            this.actions,
          );
          break;
        case ProxyType.Payable:
          method = this.contracts.payableProxy.methods.operate(
            this.accounts,
            this.actions,
            this.sendEthTo ||
            (options && options.from) ||
            this.contracts.payableProxy.options.from,
          );
          break;
        case ProxyType.Signed:
          method = this.contracts.signedOperationProxy.methods.operate(
            this.accounts,
            this.actions,
            this.generateAuthData(),
          );
          break;
        default:
          // noinspection ExceptionCaughtLocallyJS
          throw new Error(`Invalid proxy type: ${this.proxy}`);
      }

      return this.contracts.callContractFunction(method, options);
    } catch (error) {
      this.committed = false;
      throw error;
    }
  }

  private liquidateExpiredAccountInternal(
    liquidate: Liquidate,
    maxExpiryTimestamp: Integer,
    contractAddress: address,
  ): AccountOperation {
    this.addActionArgs(liquidate, {
      actionType: ActionType.Trade,
      amount: liquidate.amount,
      primaryMarketId: liquidate.liquidMarketId.toFixed(0),
      secondaryMarketId: liquidate.payoutMarketId.toFixed(0),
      otherAccountId: this.getAccountId(
        liquidate.liquidAccountOwner,
        liquidate.liquidAccountId,
      ),
      otherAddress: contractAddress,
      data: toBytes(liquidate.liquidMarketId, maxExpiryTimestamp),
    });
    return this;
  }

  private fullyLiquidateExpiredAccountInternal(
    primaryAccountOwner: address,
    primaryAccountNumber: Integer,
    expiredAccountOwner: address,
    expiredAccountNumber: Integer,
    expiredMarket: Integer,
    expiryTimestamp: Integer,
    blockTimestamp: Integer,
    weis: { [marketId: string]: Integer },
    prices: { [marketId: string]: Integer },
    spreadPremiums: { [marketId: string]: Integer },
    collateralPreferences: Integer[],
    contractAddress: address,
  ): AccountOperation {
    // hardcoded values
    const networkExpiryConstants = expiryConstants[this.networkId];
    const defaultSpread = new BigNumber(networkExpiryConstants.spread);
    const expiryRampTime = new BigNumber(networkExpiryConstants.expiryRampTime);

    // get info about the expired market
    let owedWei = weis[expiredMarket.toNumber()];
    const owedPrice = prices[expiredMarket.toNumber()];
    const owedSpreadMultiplier = spreadPremiums[expiredMarket.toNumber()].plus(1);

    // error checking
    if (owedWei.gte(0)) {
      throw new Error('Expired account must have negative expired balance');
    }
    if (blockTimestamp.lt(expiryTimestamp)) {
      throw new Error('Expiry timestamp must be larger than blockTimestamp');
    }

    // loop through each collateral type as long as there is some debt left
    for (let i = 0; i < collateralPreferences.length && owedWei.lt(0); i += 1) {
      // get info about the next collateral market
      const heldMarket = collateralPreferences[i];
      const heldWei = weis[heldMarket.toFixed(0)];

      // skip this collateral market if the account is not positive in this market
      if (heldWei.lte(0)) {
        continue;
      }

      const heldPrice = prices[heldMarket.toFixed(0)];
      const heldSpreadMultiplier = spreadPremiums[heldMarket.toFixed(0)].plus(1);

      // get the relative value of each market
      const rampAdjustment = BigNumber.min(
        blockTimestamp.minus(expiryTimestamp)
          .div(expiryRampTime),
        INTEGERS.ONE,
      );
      const spread = defaultSpread
        .times(heldSpreadMultiplier)
        .times(owedSpreadMultiplier)
        .plus(1);
      const heldValue = heldWei.times(heldPrice)
        .abs();
      const owedValue = owedWei
        .times(owedPrice)
        .times(rampAdjustment)
        .times(spread)
        .abs();

      // add variables that need to be populated
      let primaryMarketId: Integer;
      let secondaryMarketId: Integer;

      // set remaining owedWei and the marketIds depending on which market will 'bound' the action
      if (heldValue.gt(owedValue)) {
        // we expect no remaining owedWei
        owedWei = INTEGERS.ZERO;

        primaryMarketId = expiredMarket;
        secondaryMarketId = heldMarket;
      } else {
        // calculate the expected remaining owedWei
        owedWei = owedValue
          .minus(heldValue)
          .div(owedValue)
          .times(owedWei);

        primaryMarketId = heldMarket;
        secondaryMarketId = expiredMarket;
      }

      // add the action to the current actions
      this.addActionArgs(
        {
          primaryAccountOwner,
          primaryAccountId: primaryAccountNumber,
        },
        {
          actionType: ActionType.Trade,
          amount: {
            value: INTEGERS.ZERO,
            denomination: AmountDenomination.Principal,
            reference: AmountReference.Target,
          },
          primaryMarketId: primaryMarketId.toFixed(0),
          secondaryMarketId: secondaryMarketId.toFixed(0),
          otherAccountId: this.getAccountId(
            expiredAccountOwner,
            expiredAccountNumber,
          ),
          otherAddress: contractAddress,
          data: toBytes(expiredMarket, expiryTimestamp),
        },
      );
    }

    return this;
  }

  // ============ Private Helper Functions ============

  private exchange(
    exchange: Exchange,
    actionType: ActionType,
  ): AccountOperation {
    const {
      bytes,
      exchangeWrapperAddress,
    }: {
      bytes: number[];
      exchangeWrapperAddress: string;
    } = this.orderMapper.mapOrder(exchange.order);

    const [primaryMarketId, secondaryMarketId] =
      actionType === ActionType.Buy
        ? [exchange.makerMarketId, exchange.takerMarketId]
        : [exchange.takerMarketId, exchange.makerMarketId];

    const orderData = bytes.map((a: number): number[] => [a]);

    this.addActionArgs(exchange, {
      actionType,
      amount: exchange.amount,
      otherAddress: exchangeWrapperAddress,
      data: orderData,
      primaryMarketId: primaryMarketId.toFixed(0),
      secondaryMarketId: secondaryMarketId.toFixed(0),
    });

    return this;
  }

  private addActionArgs(action: AccountAction, args: OptionalActionArgs): void {
    if (this.committed) {
      throw new Error('Operation already committed');
    }

    const amount = args.amount
      ? {
        sign: !args.amount.value.isNegative(),
        denomination: args.amount.denomination,
        ref: args.amount.reference,
        value: args.amount.value.abs()
          .toFixed(0),
      }
      : {
        sign: false,
        denomination: 0,
        ref: 0,
        value: 0,
      };

    const actionArgs: ActionArgs = {
      amount,
      accountId: this.getPrimaryAccountId(action),
      actionType: args.actionType,
      primaryMarketId: args.primaryMarketId || '0',
      secondaryMarketId: args.secondaryMarketId || '0',
      otherAddress: args.otherAddress || ADDRESSES.ZERO,
      otherAccountId: args.otherAccountId || '0',
      data: args.data || [],
    };

    this.actions.push(actionArgs);
  }

  private getPrimaryAccountId(operation: AccountAction): number {
    return this.getAccountId(
      operation.primaryAccountOwner,
      operation.primaryAccountId,
    );
  }

  private getAccountId(accountOwner: string, accountNumber: Integer): number {
    const accountInfo: AccountInfo = {
      owner: accountOwner,
      number: accountNumber.toFixed(0),
    };

    const correctIndex = (i: AccountInfo) =>
      addressesAreEqual(i.owner, accountInfo.owner) &&
      i.number === accountInfo.number;
    const index = this.accounts.findIndex(correctIndex);

    if (index >= 0) {
      return index;
    }

    this.accounts.push(accountInfo);

    return this.accounts.length - 1;
  }

  private generateAuthData(): {
    numActions: string;
    header: {
      expiration: string;
      salt: string;
      sender: string;
      signer: string;
    };
    signature: number[][];
  }[] {
    let actionIndex: Integer = INTEGERS.ZERO;
    const result = [];

    const emptyAuth = {
      numActions: '0',
      header: {
        expiration: '0',
        salt: '0',
        sender: ADDRESSES.ZERO,
        signer: ADDRESSES.ZERO,
      },
      signature: [],
    };

    // for each signed auth
    for (let i = 0; i < this.auths.length; i += 1) {
      const auth = this.auths[i];

      // if empty auth needed, push it
      if (auth.startIndex.gt(actionIndex)) {
        result.push({
          ...emptyAuth,
          numActions: auth.startIndex.minus(actionIndex)
            .toFixed(0),
        });
      }

      // push this auth
      result.push({
        numActions: auth.numActions.toFixed(0),
        header: {
          expiration: auth.expiration.toFixed(0),
          salt: auth.salt.toFixed(0),
          sender: auth.sender,
          signer: auth.signer,
        },
        signature: toBytes(auth.typedSignature),
      });

      // update the action index
      actionIndex = auth.startIndex.plus(auth.numActions);
    }

    // push a final empty auth if necessary
    if (actionIndex.lt(this.actions.length)) {
      result.push({
        ...emptyAuth,
        numActions: new BigNumber(this.actions.length)
          .minus(actionIndex)
          .toFixed(0),
      });
    }

    return result;
  }
}
