import BigNumber from 'bignumber.js';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import {
  TestExchangeWrapperOrder,
  TestOrderType,
} from '../helpers/types';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';
import { resetEVM, snapshot } from '../helpers/EVM';
import { setupMarkets } from '../helpers/DolomiteMarginHelpers';
import {
  Action,
  ActionType,
  address,
  ADDRESSES,
  AmountDenomination,
  AmountReference,
  INTEGERS,
  Operation,
  ProxyType,
  SignedOperation,
  SigningMethod,
  TxResult,
} from '../../src';
import { expectAssertFailure, expectThrow } from '../helpers/Expect';
import { toBytes } from '../../src/lib/BytesHelper';

let dolomiteMargin: TestDolomiteMargin;
let accounts: address[];
let snapshotId: string;
let defaultSender: address;
let defaultSigner: address;
let rando: address;
let admin: address;
const defaultExpiration = new BigNumber(0);
const defaultSalt = new BigNumber(425);
const defaultSignerNumber = new BigNumber(111);
const defaultSenderNumber = new BigNumber(222);
const randoNumber = new BigNumber(333);
const defaultMarket = new BigNumber(1);
const takerMarket = new BigNumber(1);
const makerMarket = new BigNumber(2);
const par = new BigNumber('1e18');
const tradeId = new BigNumber(1234);

const defaultAssetAmount = {
  value: INTEGERS.ZERO,
  denomination: AmountDenomination.Par,
  reference: AmountReference.Delta,
};

let signedDepositOperation: SignedOperation;
let signedWithdrawOperation: SignedOperation;
let signedTransferOperation: SignedOperation;
let signedBuyOperation: SignedOperation;
let signedSellOperation: SignedOperation;
let signedTradeOperation: SignedOperation;
let signedCallOperation: SignedOperation;
let signedLiquidateOperation: SignedOperation;
let signedVaporizeOperation: SignedOperation;

describe('SignedOperationProxy', () => {
  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    accounts = r.accounts;

    admin = accounts[0];
    defaultSender = accounts[5];
    defaultSigner = accounts[6];
    rando = accounts[7];

    const vaporizableAccount = {
      owner: rando,
      number: new BigNumber(890),
    };
    const liquidatableAccount = {
      owner: rando,
      number: new BigNumber(891),
    };

    await resetEVM();
    await setupMarkets(dolomiteMargin, accounts);

    expect(dolomiteMargin.signedOperations.getDomainHash())
      .to.eql(await dolomiteMargin.signedOperations.getNetworkDomainHash());

    const exchangeWrapperAddress = dolomiteMargin.testing.exchangeWrapper.address;

    const testOrder: TestExchangeWrapperOrder = {
      exchangeWrapperAddress,
      type: TestOrderType.Test,
      originator: defaultSigner,
      makerToken: await dolomiteMargin.getters.getMarketTokenAddress(makerMarket),
      takerToken: await dolomiteMargin.getters.getMarketTokenAddress(takerMarket),
      makerAmount: INTEGERS.ZERO,
      takerAmount: INTEGERS.ZERO,
      desiredMakerAmount: INTEGERS.ZERO,
      allegedTakerAmount: INTEGERS.ZERO,
    };

    await Promise.all([
      dolomiteMargin.testing.autoTrader.setData(tradeId, defaultAssetAmount),
      dolomiteMargin.permissions.approveOperator(exchangeWrapperAddress, { from: rando }),
      dolomiteMargin.permissions.approveOperator(dolomiteMargin.testing.autoTrader.address, {
        from: rando,
      }),
      dolomiteMargin.testing.setAccountBalance(
        vaporizableAccount.owner,
        vaporizableAccount.number,
        takerMarket,
        par.times(-1),
      ),
      dolomiteMargin.testing.setAccountBalance(
        liquidatableAccount.owner,
        liquidatableAccount.number,
        takerMarket,
        par.times(-1),
      ),
      dolomiteMargin.testing.setAccountBalance(
        liquidatableAccount.owner,
        liquidatableAccount.number,
        makerMarket,
        par,
      ),
    ]);

    snapshotId = await snapshot();

    signedDepositOperation = await createSignedOperation('deposit', {
      primaryAccountId: defaultSignerNumber,
      primaryAccountOwner: defaultSigner,
      from: defaultSigner,
      marketId: defaultMarket,
      amount: defaultAssetAmount,
    });
    signedWithdrawOperation = await createSignedOperation('withdraw', {
      primaryAccountId: defaultSignerNumber,
      primaryAccountOwner: defaultSigner,
      to: defaultSigner,
      marketId: defaultMarket,
      amount: defaultAssetAmount,
    });
    signedTransferOperation = await createSignedOperation('transfer', {
      primaryAccountId: defaultSignerNumber,
      primaryAccountOwner: defaultSigner,
      toAccountOwner: defaultSender,
      toAccountId: defaultSenderNumber,
      marketId: defaultMarket,
      amount: defaultAssetAmount,
    });
    signedBuyOperation = await createSignedOperation('buy', {
      primaryAccountId: defaultSignerNumber,
      primaryAccountOwner: defaultSigner,
      takerMarketId: takerMarket,
      makerMarketId: makerMarket,
      order: testOrder,
      amount: defaultAssetAmount,
    });
    signedSellOperation = await createSignedOperation('sell', {
      primaryAccountId: defaultSignerNumber,
      primaryAccountOwner: defaultSigner,
      takerMarketId: takerMarket,
      makerMarketId: makerMarket,
      order: testOrder,
      amount: defaultAssetAmount,
    });
    signedTradeOperation = await createSignedOperation('trade', {
      primaryAccountId: defaultSignerNumber,
      primaryAccountOwner: defaultSigner,
      otherAccountOwner: rando,
      otherAccountId: randoNumber,
      inputMarketId: takerMarket,
      outputMarketId: makerMarket,
      autoTrader: dolomiteMargin.testing.autoTrader.address,
      data: toBytes(tradeId),
      amount: defaultAssetAmount,
    });
    signedCallOperation = await createSignedOperation('call', {
      primaryAccountId: defaultSignerNumber,
      primaryAccountOwner: defaultSigner,
      callee: dolomiteMargin.testing.callee.address,
      data: toBytes(33, 44),
    });
    signedLiquidateOperation = await createSignedOperation('liquidate', {
      primaryAccountId: defaultSignerNumber,
      primaryAccountOwner: defaultSigner,
      liquidAccountOwner: liquidatableAccount.owner,
      liquidAccountId: liquidatableAccount.number,
      liquidMarketId: takerMarket,
      payoutMarketId: makerMarket,
      amount: defaultAssetAmount,
    });
    signedVaporizeOperation = await createSignedOperation('vaporize', {
      primaryAccountId: defaultSignerNumber,
      primaryAccountOwner: defaultSigner,
      vaporAccountOwner: vaporizableAccount.owner,
      vaporAccountId: vaporizableAccount.number,
      vaporMarketId: takerMarket,
      payoutMarketId: makerMarket,
      amount: defaultAssetAmount,
    });
  });

  beforeEach(async () => {
    await resetEVM(snapshotId);
  });

  describe('Signing Operations', () => {
    it('Succeeds for eth.sign', async () => {
      const operation = { ...signedTradeOperation };
      operation.typedSignature = await dolomiteMargin.signedOperations.signOperation(
        operation,
        SigningMethod.Hash,
      );
      expect(dolomiteMargin.signedOperations.operationHasValidSignature(operation)).to.eql(
        true,
      );
    });

    it('Succeeds for eth_signTypedData', async () => {
      const operation = { ...signedTradeOperation };
      operation.typedSignature = await dolomiteMargin.signedOperations.signOperation(
        operation,
        SigningMethod.TypedData,
      );
      expect(dolomiteMargin.signedOperations.operationHasValidSignature(operation)).to.eql(
        true,
      );
    });

    it('Recognizes a bad signature', async () => {
      const operation = { ...signedTradeOperation };
      operation.typedSignature = `0x${'1b'.repeat(65)}00`;
      expect(dolomiteMargin.signedOperations.operationHasValidSignature(operation)).to.eql(
        false,
      );
    });
  });

  describe('Signing Cancel Operations', () => {
    it('Succeeds for eth.sign', async () => {
      const operation = { ...signedTradeOperation };
      const cancelSig = await dolomiteMargin.signedOperations.signCancelOperation(
        operation,
        SigningMethod.Hash,
      );
      expect(
        dolomiteMargin.signedOperations.cancelOperationHasValidSignature(
          operation,
          cancelSig,
        ),
      ).to.eql(true);
    });

    it('Succeeds for eth_signTypedData', async () => {
      const operation = { ...signedTradeOperation };
      const cancelSig = await dolomiteMargin.signedOperations.signCancelOperation(
        operation,
        SigningMethod.TypedData,
      );
      expect(
        dolomiteMargin.signedOperations.cancelOperationHasValidSignature(
          operation,
          cancelSig,
        ),
      ).to.eql(true);
    });

    it('Recognizes a bad signature', async () => {
      const operation = { ...signedTradeOperation };
      const cancelSig = `0x${'1b'.repeat(65)}00`;
      expect(
        dolomiteMargin.signedOperations.cancelOperationHasValidSignature(
          operation,
          cancelSig,
        ),
      ).to.eql(false);
    });
  });

  describe('shutDown', () => {
    it('Succeeds', async () => {
      expect(await dolomiteMargin.signedOperations.isOperational()).to.eql(true);
      await dolomiteMargin.contracts.callContractFunction(
        dolomiteMargin.contracts.signedOperationProxy.methods.shutDown(),
        { from: admin },
      );
      expect(await dolomiteMargin.signedOperations.isOperational()).to.eql(false);
    });

    it('Succeeds when it is already shutDown', async () => {
      await dolomiteMargin.contracts.callContractFunction(
        dolomiteMargin.contracts.signedOperationProxy.methods.shutDown(),
        { from: admin },
      );
      expect(await dolomiteMargin.signedOperations.isOperational()).to.eql(false);
      await dolomiteMargin.contracts.callContractFunction(
        dolomiteMargin.contracts.signedOperationProxy.methods.shutDown(),
        { from: admin },
      );
      expect(await dolomiteMargin.signedOperations.isOperational()).to.eql(false);
    });

    it('Fails for non-owner', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(
          dolomiteMargin.contracts.signedOperationProxy.methods.shutDown(),
          { from: rando },
        ),
      );
    });
  });

  describe('startUp', () => {
    it('Succeeds after being shutDown', async () => {
      await dolomiteMargin.contracts.callContractFunction(
        dolomiteMargin.contracts.signedOperationProxy.methods.shutDown(),
        { from: admin },
      );
      expect(await dolomiteMargin.signedOperations.isOperational()).to.eql(false);
      await dolomiteMargin.contracts.callContractFunction(
        dolomiteMargin.contracts.signedOperationProxy.methods.startUp(),
        { from: admin },
      );
      expect(await dolomiteMargin.signedOperations.isOperational()).to.eql(true);
    });

    it('Succeeds when it is already operational', async () => {
      expect(await dolomiteMargin.signedOperations.isOperational()).to.eql(true);
      await dolomiteMargin.contracts.callContractFunction(
        dolomiteMargin.contracts.signedOperationProxy.methods.startUp(),
        { from: admin },
      );
      expect(await dolomiteMargin.signedOperations.isOperational()).to.eql(true);
    });

    it('Fails for non-owner', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(
          dolomiteMargin.contracts.signedOperationProxy.methods.startUp(),
          { from: rando },
        ),
      );
    });
  });

  describe('cancel', () => {
    it('Succeeds', async () => {
      await expectValid([signedWithdrawOperation]);
      const txResult1 = await dolomiteMargin.signedOperations.cancelOperation(
        signedWithdrawOperation,
      );
      await expectInvalid([signedWithdrawOperation]);
      const txResult2 = await dolomiteMargin.signedOperations.cancelOperation(
        signedWithdrawOperation,
      );
      await expectInvalid([signedWithdrawOperation]);

      const logs1 = dolomiteMargin.logs.parseLogs(txResult1);
      expect(logs1[0].name).to.eql('LogOperationCanceled');
      expect(logs1[0].args).to.eql({
        canceler: signedWithdrawOperation.signer,
        operationHash: dolomiteMargin.signedOperations.getOperationHash(
          signedWithdrawOperation,
        ),
      });
      const logs2 = dolomiteMargin.logs.parseLogs(txResult2);
      expect(logs2[0].name).to.eql(logs1[0].name);
      expect(logs2[0].args).to.eql(logs1[0].args);
    });

    it('Succeeds for two-account operations', async () => {
      await expectValid([signedTransferOperation]);
      const txResult1 = await dolomiteMargin.signedOperations.cancelOperation(
        signedTransferOperation,
      );
      await expectInvalid([signedTransferOperation]);
      const txResult2 = await dolomiteMargin.signedOperations.cancelOperation(
        signedTransferOperation,
      );
      await expectInvalid([signedTransferOperation]);

      const logs1 = dolomiteMargin.logs.parseLogs(txResult1);
      expect(logs1[0].name).to.eql('LogOperationCanceled');
      expect(logs1[0].args).to.eql({
        canceler: signedTransferOperation.signer,
        operationHash: dolomiteMargin.signedOperations.getOperationHash(
          signedTransferOperation,
        ),
      });
      const logs2 = dolomiteMargin.logs.parseLogs(txResult2);
      expect(logs2[0].name).to.eql(logs1[0].name);
      expect(logs2[0].args).to.eql(logs1[0].args);
    });

    it('Fails for non-signer', async () => {
      await expectThrow(
        dolomiteMargin.signedOperations.cancelOperation(signedTransferOperation, {
          from: rando,
        }),
        'SignedOperationProxy: Canceler must be signer',
      );
    });
  });

  describe('Basic', () => {
    it('Succeeds for basic test', async () => {
      const actions: Action[] = [
        {
          actionType: ActionType.Deposit,
          primaryAccountOwner: defaultSigner,
          primaryAccountNumber: defaultSignerNumber,
          secondaryAccountOwner: ADDRESSES.ZERO,
          secondaryAccountNumber: INTEGERS.ZERO,
          primaryMarketId: defaultMarket,
          secondaryMarketId: INTEGERS.ZERO,
          otherAddress: defaultSigner,
          data: '0x',
          amount: {
            sign: false,
            ref: AmountReference.Delta,
            denomination: AmountDenomination.Actual,
            value: INTEGERS.ZERO,
          },
        },
      ];
      const operation: Operation = {
        actions,
        expiration: defaultExpiration,
        salt: defaultSalt,
        sender: defaultSender,
        signer: defaultSigner,
      };
      const typedSignature = await dolomiteMargin.signedOperations.signOperation(
        operation,
        SigningMethod.Hash,
      );
      const signedOperation: SignedOperation = {
        ...operation,
        typedSignature,
      };
      await expectValid([signedOperation]);
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedOperation)
        .commit({ from: defaultSender });
      expectLogs(txResult, [
        'LogOperationExecuted',
        'LogOperation',
        'LogDeposit',
      ]);
      await expectInvalid([signedOperation]);

      console.log(`\tSignedOperationProxy gas used: ${txResult.gasUsed}`);
    });

    it('Succeeds for deposit', async () => {
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedDepositOperation)
        .commit({ from: defaultSender });
      expectLogs(txResult, [
        'LogOperationExecuted',
        'LogOperation',
        'LogDeposit',
      ]);
      await expectInvalid([signedDepositOperation]);
    });

    it('Succeeds for withdraw', async () => {
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedWithdrawOperation)
        .commit({ from: defaultSender });
      expectLogs(txResult, [
        'LogOperationExecuted',
        'LogOperation',
        'LogWithdraw',
      ]);
      await expectInvalid([signedWithdrawOperation]);
    });

    it('Succeeds for transfer', async () => {
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedTransferOperation)
        .commit({ from: defaultSender });
      expectLogs(txResult, [
        'LogOperationExecuted',
        'LogOperation',
        'LogTransfer',
      ]);
      await expectInvalid([signedTransferOperation]);
    });

    it('Succeeds for buy', async () => {
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedBuyOperation)
        .commit({ from: defaultSender });
      expectLogs(txResult, ['LogOperationExecuted', 'LogOperation', 'LogBuy']);
      await expectInvalid([signedBuyOperation]);
    });

    it('Succeeds for sell', async () => {
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedSellOperation)
        .commit({ from: defaultSender });
      expectLogs(txResult, ['LogOperationExecuted', 'LogOperation', 'LogSell']);
      await expectInvalid([signedSellOperation]);
    });

    it('Succeeds for trade', async () => {
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedTradeOperation)
        .commit({ from: defaultSender });
      expectLogs(txResult, [
        'LogOperationExecuted',
        'LogOperation',
        'LogTrade',
      ]);
      await expectInvalid([signedTradeOperation]);
    });

    it('Succeeds for special trade if sent from a global operator', async () => {
      const specialSignedOperation = await createSignedOperation('trade', {
        primaryAccountId: defaultSignerNumber,
        primaryAccountOwner: defaultSigner,
        otherAccountOwner: rando,
        otherAccountId: randoNumber,
        inputMarketId: takerMarket,
        outputMarketId: makerMarket,
        autoTrader: dolomiteMargin.expiry.address,
        data: toBytes(tradeId),
        amount: defaultAssetAmount,
      });
      await dolomiteMargin.admin.setGlobalOperator(defaultSender, true, { from: admin });
      await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(specialSignedOperation)
        .commit({ from: defaultSender });
    });

    it('Fails for special trade', async () => {
      const specialSignedOperation = await createSignedOperation('trade', {
        primaryAccountId: defaultSignerNumber,
        primaryAccountOwner: defaultSigner,
        otherAccountOwner: rando,
        otherAccountId: randoNumber,
        inputMarketId: takerMarket,
        outputMarketId: makerMarket,
        autoTrader: dolomiteMargin.expiry.address,
        data: toBytes(tradeId),
        amount: defaultAssetAmount,
      });
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(specialSignedOperation)
          .commit({ from: defaultSender }),
        'SignedOperationProxy: Unpermissioned trade operator'
      );
    });

    it('Succeeds for call (0 bytes)', async () => {
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedCallOperation)
        .commit({ from: defaultSender });
      expectLogs(txResult, ['LogOperationExecuted', 'LogOperation', 'LogCall']);
      await expectInvalid([signedCallOperation]);
    });

    it('Succeeds for call (<32 bytes)', async () => {
      const signedCallShortOperation = await createSignedOperation('call', {
        primaryAccountId: defaultSignerNumber,
        primaryAccountOwner: defaultSigner,
        callee: dolomiteMargin.testing.simpleCallee.address,
        data: [[1], [2], [3]],
      });
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedCallShortOperation)
        .commit({ from: defaultSender });
      expectLogs(txResult, ['LogOperationExecuted', 'LogOperation', 'LogCall']);
      await expectInvalid([signedCallShortOperation]);
    });

    it('Succeeds for call (>32, <64 bytes)', async () => {
      const signedCallOddOperation = await createSignedOperation('call', {
        primaryAccountId: defaultSignerNumber,
        primaryAccountOwner: defaultSigner,
        callee: dolomiteMargin.testing.simpleCallee.address,
        data: toBytes(1234).concat([[1], [2], [3]]),
      });
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedCallOddOperation)
        .commit({ from: defaultSender });
      expectLogs(txResult, ['LogOperationExecuted', 'LogOperation', 'LogCall']);
      await expectInvalid([signedCallOddOperation]);
    });

    it('Fails for liquidate', async () => {
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(signedLiquidateOperation)
          .commit({ from: defaultSender }),
        'SignedOperationProxy: Cannot perform liquidations'
      );
    });

    it('Succeeds for vaporize', async () => {
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedVaporizeOperation)
        .commit({ from: defaultSender });
      expectLogs(txResult, [
        'LogOperationExecuted',
        'LogOperation',
        'LogVaporize',
      ]);
      await expectInvalid([signedVaporizeOperation]);
    });
  });

  describe('Failures for each actionType', () => {
    async function randoifySignedOperation(
      signedOperation: SignedOperation,
    ): Promise<SignedOperation> {
      const randoifiedOperation = { ...signedOperation };
      randoifiedOperation.actions = [{}] as Action[];
      randoifiedOperation.actions[0] = {
        ...signedOperation.actions[0],
        primaryAccountOwner: rando,
      };
      randoifiedOperation.typedSignature = await dolomiteMargin.signedOperations.signOperation(
        randoifiedOperation,
        SigningMethod.Hash,
      );
      return randoifiedOperation;
    }

    it('Fails for deposit', async () => {
      const badOperation = await randoifySignedOperation(
        signedDepositOperation,
      );
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(badOperation)
          .commit({ from: defaultSender }),
        `SignedOperationProxy: Signer not authorized <${defaultSigner.toLowerCase()}>`,
      );
    });

    it('Fails for withdraw', async () => {
      const badOperation = await randoifySignedOperation(
        signedWithdrawOperation,
      );
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(badOperation)
          .commit({ from: defaultSender }),
        `SignedOperationProxy: Signer not authorized <${defaultSigner.toLowerCase()}>`,
      );
    });

    it('Fails for transfer', async () => {
      const badOperation = await randoifySignedOperation(
        signedTransferOperation,
      );
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(badOperation)
          .commit({ from: defaultSender }),
        `SignedOperationProxy: Signer not authorized <${defaultSigner.toLowerCase()}>`,
      );
    });

    it('Fails for buy', async () => {
      const badOperation = await randoifySignedOperation(signedBuyOperation);
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(badOperation)
          .commit({ from: defaultSender }),
        `SignedOperationProxy: Signer not authorized <${defaultSigner.toLowerCase()}>`,
      );
    });

    it('Fails for sell', async () => {
      const badOperation = await randoifySignedOperation(signedSellOperation);
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(badOperation)
          .commit({ from: defaultSender }),
        `SignedOperationProxy: Signer not authorized <${defaultSigner.toLowerCase()}>`,
      );
    });

    it('Fails for trade', async () => {
      const badOperation = await randoifySignedOperation(signedTradeOperation);
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(badOperation)
          .commit({ from: defaultSender }),
        `SignedOperationProxy: Signer not authorized <${defaultSigner.toLowerCase()}>`,
      );
    });

    it('Fails for call (0 bytes)', async () => {
      const badOperation = await randoifySignedOperation(signedCallOperation);
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(badOperation)
          .commit({ from: defaultSender }),
        `SignedOperationProxy: Signer not authorized <${defaultSigner.toLowerCase()}>`,
      );
    });

    it('Fails for liquidate', async () => {
      const badOperation = await randoifySignedOperation(
        signedLiquidateOperation,
      );
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(badOperation)
          .commit({ from: defaultSender }),
        `SignedOperationProxy: Signer not authorized <${defaultSigner.toLowerCase()}>`,
      );
    });

    it('Fails for vaporize', async () => {
      const badOperation = await randoifySignedOperation(
        signedVaporizeOperation,
      );
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(badOperation)
          .commit({ from: defaultSender }),
        `SignedOperationProxy: Signer not authorized <${defaultSigner.toLowerCase()}>`,
      );
    });
  });

  describe('Other failures', () => {
    it('Fails for expired operation', async () => {
      const expiredOperation: SignedOperation = {
        ...signedDepositOperation,
        expiration: INTEGERS.ONE,
      };
      expiredOperation.typedSignature = await dolomiteMargin.signedOperations.signOperation(
        expiredOperation,
        SigningMethod.Hash,
      );
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(expiredOperation)
          .commit({ from: defaultSender }),
        'SignedOperationProxy: Signed operation is expired',
      );
    });

    it('Fails for msg.sender mismatch', async () => {
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(signedDepositOperation)
          .commit({ from: rando }),
        'SignedOperationProxy: Operation sender mismatch',
      );
    });

    it('Fails for hash already used', async () => {
      await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedWithdrawOperation)
        .commit({ from: defaultSender });
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(signedWithdrawOperation)
          .commit({ from: defaultSender }),
        'SignedOperationProxy: Hash already used or canceled',
      );
    });

    it('Fails for hash canceled', async () => {
      await dolomiteMargin.signedOperations.cancelOperation(signedWithdrawOperation);
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(signedWithdrawOperation)
          .commit({ from: defaultSender }),
        'SignedOperationProxy: Hash already used or canceled',
      );
    });

    it('Fails for authorization that overflows', async () => {
      await expectAssertFailure(
        dolomiteMargin.contracts.callContractFunction(
          dolomiteMargin.contracts.signedOperationProxy.methods.operate(
            [
              {
                owner: defaultSigner,
                number: defaultSignerNumber.toFixed(0),
              },
            ],
            [
              {
                actionType: ActionType.Deposit,
                accountId: '0',
                primaryMarketId: '0',
                secondaryMarketId: '0',
                otherAddress: ADDRESSES.ZERO,
                otherAccountId: '0',
                data: [],
                amount: {
                  sign: false,
                  ref: AmountReference.Delta,
                  denomination: AmountDenomination.Par,
                  value: '0',
                },
              },
            ],
            [
              {
                numActions: '2',
                header: {
                  expiration: '0',
                  salt: '0',
                  sender: defaultSender,
                  signer: defaultSigner,
                },
                signature: toBytes(signedDepositOperation.typedSignature),
              },
            ],
          ),
          { from: defaultSender },
        ),
      );
    });

    it('Fails for authorization past end-of-actions', async () => {
      const depositAction = signedDepositOperation.actions[0];
      await expectAssertFailure(
        dolomiteMargin.contracts.callContractFunction(
          dolomiteMargin.contracts.signedOperationProxy.methods.operate(
            [
              {
                owner: defaultSigner,
                number: defaultSignerNumber.toFixed(0),
              },
            ],
            [
              {
                ...depositAction,
                accountId: '0',
                otherAccountId: '0',
                primaryMarketId: depositAction.primaryMarketId.toFixed(0),
                secondaryMarketId: depositAction.secondaryMarketId.toFixed(0),
                data: [],
                amount: {
                  ...depositAction.amount,
                  value: depositAction.amount.value.toFixed(0),
                },
              },
            ],
            [
              {
                numActions: '1',
                header: {
                  expiration: '0',
                  salt: '0',
                  sender: defaultSender,
                  signer: defaultSigner,
                },
                signature: toBytes(signedDepositOperation.typedSignature),
              },
              {
                numActions: '1',
                header: {
                  expiration: '0',
                  salt: '0',
                  sender: defaultSender,
                  signer: defaultSigner,
                },
                signature: toBytes(signedWithdrawOperation.typedSignature),
              },
            ],
          ),
          { from: defaultSender },
        ),
      );
    });

    it('Fails if not all actions are signed', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(
          dolomiteMargin.contracts.signedOperationProxy.methods.operate(
            [
              {
                owner: defaultSigner,
                number: defaultSignerNumber.toFixed(0),
              },
            ],
            [
              {
                actionType: ActionType.Deposit,
                accountId: '0',
                primaryMarketId: '0',
                secondaryMarketId: '0',
                otherAddress: ADDRESSES.ZERO,
                otherAccountId: '0',
                data: [],
                amount: {
                  sign: false,
                  ref: AmountReference.Delta,
                  denomination: AmountDenomination.Par,
                  value: '0',
                },
              },
            ],
            [],
          ),
          { from: defaultSender },
        ),
        'SignedOperationProxy: Not all actions are signed',
      );
    });

    it('Fails for incorrect signature', async () => {
      const invalidSigOperation: SignedOperation = {
        ...signedDepositOperation,
        salt: new BigNumber(999),
      };
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(invalidSigOperation)
          .commit({ from: defaultSender }),
        'SignedOperationProxy: Invalid signature',
      );
    });

    it('Fails if non-operational', async () => {
      await dolomiteMargin.contracts.callContractFunction(
        dolomiteMargin.contracts.signedOperationProxy.methods.shutDown(),
        { from: admin },
      );
      await expectThrow(
        dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(signedDepositOperation)
          .commit({ from: defaultSender }),
        'SignedOperationProxy: Contract is not operational',
      );
    });
  });

  describe('Advanced', () => {
    it('Succeeds only for transfers involving sender or signer', async () => {
      const defaultBlob = {
        primaryAccountId: defaultSignerNumber,
        toAccountId: defaultSenderNumber,
        marketId: defaultMarket,
        amount: defaultAssetAmount,
      };
      const goodTransfer1 = await createSignedOperation('transfer', {
        ...defaultBlob,
        primaryAccountOwner: defaultSigner,
        toAccountOwner: defaultSender,
      });
      const goodTransfer2 = await createSignedOperation('transfer', {
        ...defaultBlob,
        primaryAccountOwner: defaultSender,
        toAccountOwner: defaultSigner,
      });
      const goodTransfer3 = await createSignedOperation('transfer', {
        ...defaultBlob,
        primaryAccountOwner: defaultSigner,
        toAccountOwner: defaultSigner,
      });
      const goodTransfer4 = await createSignedOperation('transfer', {
        ...defaultBlob,
        primaryAccountOwner: defaultSender,
        toAccountOwner: defaultSender,
      });
      const allOperations = [
        goodTransfer1,
        goodTransfer2,
        goodTransfer3,
        goodTransfer4,
      ];
      for (const o in allOperations) {
        const operation = allOperations[o];
        const txResult = await dolomiteMargin.operation
          .initiate({ proxy: ProxyType.Signed })
          .addSignedOperation(operation)
          .commit({ from: defaultSender });
        expectLogs(txResult, [
          'LogOperationExecuted',
          'LogOperation',
          'LogTransfer',
        ]);
      }
    });

    it('Fails for transfers involving non-sender or non-signer accounts', async () => {
      const defaultBlob = {
        primaryAccountId: defaultSignerNumber,
        toAccountId: defaultSenderNumber,
        marketId: defaultMarket,
        amount: defaultAssetAmount,
      };
      const badTransfer1 = await createSignedOperation('transfer', {
        ...defaultBlob,
        primaryAccountOwner: rando,
        toAccountOwner: defaultSender,
      });
      const badTransfer2 = await createSignedOperation('transfer', {
        ...defaultBlob,
        primaryAccountOwner: defaultSender,
        toAccountOwner: rando,
      });
      const badTransfer3 = await createSignedOperation('transfer', {
        ...defaultBlob,
        primaryAccountOwner: defaultSigner,
        toAccountOwner: rando,
      });
      const badTransfer4 = await createSignedOperation('transfer', {
        ...defaultBlob,
        primaryAccountOwner: rando,
        toAccountOwner: defaultSigner,
      });
      const badTransfer5 = await createSignedOperation('transfer', {
        ...defaultBlob,
        primaryAccountOwner: rando,
        toAccountOwner: rando,
      });
      const allOperations = [
        badTransfer1,
        badTransfer2,
        badTransfer3,
        badTransfer4,
        badTransfer5,
      ];
      for (const o in allOperations) {
        const operation = allOperations[o];
        await expectThrow(
          dolomiteMargin.operation
            .initiate({ proxy: ProxyType.Signed })
            .addSignedOperation(operation)
            .commit({ from: defaultSender }),
          `SignedOperationProxy: Signer not authorized <${defaultSigner.toLowerCase()}>`,
        );
      }
    });

    it('Succeeds for data with less than 32 bytes', async () => {
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedCallOperation)
        .commit({ from: defaultSender });
      expectLogs(txResult, ['LogOperationExecuted', 'LogOperation', 'LogCall']);
    });

    it('Succeeds for multiple actions in a single operation', async () => {
      const multiActionOperation: SignedOperation = {
        ...signedDepositOperation,
      };
      multiActionOperation.actions = multiActionOperation.actions.concat(
        signedWithdrawOperation.actions,
      );
      multiActionOperation.actions = multiActionOperation.actions.concat(
        signedTransferOperation.actions,
      );
      multiActionOperation.actions = multiActionOperation.actions.concat(
        signedCallOperation.actions,
      );
      multiActionOperation.typedSignature = await dolomiteMargin.signedOperations.signOperation(
        multiActionOperation,
        SigningMethod.Hash,
      );

      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(multiActionOperation)
        .commit({ from: defaultSender });
      expectLogs(txResult, [
        'LogOperationExecuted',
        'LogOperation',
        'LogDeposit',
        'LogWithdraw',
        'LogTransfer',
        'LogCall',
      ]);
      await expectInvalid([multiActionOperation]);

      console.log(
        `\tSignedOperationProxy (multiAction) gas used: ${txResult.gasUsed}`,
      );
    });

    it('Succeeds for multiple signed operations from different signers', async () => {
      // create second signed operation
      const operation2: Operation = dolomiteMargin.operation
        .initiate()
        .deposit({
          primaryAccountOwner: rando,
          primaryAccountId: randoNumber,
          marketId: defaultMarket,
          from: rando,
          amount: defaultAssetAmount,
        })
        .createSignableOperation({
          sender: defaultSender,
          signer: rando,
        });
      const signedOperation2: SignedOperation = {
        ...operation2,
        typedSignature: await dolomiteMargin.signedOperations.signOperation(
          operation2,
          SigningMethod.Hash,
        ),
      };

      // commit the operations
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .addSignedOperation(signedWithdrawOperation)
        .addSignedOperation(signedOperation2)
        .commit({ from: defaultSender });
      expectLogs(txResult, [
        'LogOperationExecuted',
        'LogOperationExecuted',
        'LogOperation',
        'LogWithdraw',
        'LogDeposit',
      ]);
      await expectInvalid([signedWithdrawOperation, signedOperation2]);
    });

    it('Succeeds for zero-length proofs', async () => {
      const emptyOperation = {
        actions: [],
        expiration: INTEGERS.ZERO,
        salt: INTEGERS.ZERO,
        sender: ADDRESSES.ZERO,
        signer: defaultSender,
      };
      await dolomiteMargin.contracts.callContractFunction(
        dolomiteMargin.contracts.signedOperationProxy.methods.operate(
          [
            {
              owner: defaultSender,
              number: defaultSenderNumber.toFixed(0),
            },
          ],
          [
            {
              actionType: ActionType.Deposit,
              accountId: '0',
              primaryMarketId: '0',
              secondaryMarketId: '0',
              otherAddress: defaultSender,
              otherAccountId: '0',
              data: [],
              amount: {
                sign: false,
                ref: AmountReference.Delta,
                denomination: AmountDenomination.Par,
                value: '0',
              },
            },
          ],
          [
            {
              numActions: '0',
              header: {
                expiration: '0',
                salt: '0',
                sender: ADDRESSES.ZERO,
                signer: defaultSender,
              },
              signature: toBytes(
                await dolomiteMargin.signedOperations.signOperation(
                  emptyOperation,
                  SigningMethod.Hash,
                ),
              ),
            },
            {
              numActions: '1',
              header: {
                expiration: '0',
                salt: '0',
                sender: defaultSender,
                signer: defaultSender,
              },
              signature: [],
            },
          ],
        ),
        { from: defaultSender },
      );
    });

    it('Succeeds for multiple signed operations from different signers interleaved', async () => {
      // create second signed operation
      const operation2: Operation = dolomiteMargin.operation
        .initiate()
        .deposit({
          primaryAccountOwner: rando,
          primaryAccountId: randoNumber,
          marketId: defaultMarket,
          from: rando,
          amount: defaultAssetAmount,
        })
        .createSignableOperation({
          sender: defaultSender,
          signer: rando,
        });
      const signedOperation2: SignedOperation = {
        ...operation2,
        typedSignature: await dolomiteMargin.signedOperations.signOperation(
          operation2,
          SigningMethod.Hash,
        ),
      };

      // generate interleaved data
      const callData = {
        primaryAccountOwner: defaultSender,
        primaryAccountId: defaultSenderNumber,
        callee: dolomiteMargin.testing.simpleCallee.address,
        data: [[1], [255]],
      };

      // commit the operations interleaved with others
      const txResult = await dolomiteMargin.operation
        .initiate({ proxy: ProxyType.Signed })
        .call(callData)
        .addSignedOperation(signedWithdrawOperation)
        .call(callData)
        .addSignedOperation(signedOperation2)
        .call(callData)
        .commit({ from: defaultSender });
      expectLogs(txResult, [
        'LogOperationExecuted',
        'LogOperationExecuted',
        'LogOperation',
        'LogCall',
        'LogWithdraw',
        'LogCall',
        'LogDeposit',
        'LogCall',
      ]);
      await expectInvalid([signedWithdrawOperation, signedOperation2]);
    });
  });
});

// ============ Helper Functions ============

async function createSignedOperation(
  actionType: string,
  action: any,
): Promise<SignedOperation> {
  const operation: Operation = dolomiteMargin.operation
    .initiate()
    [actionType](action)
    .createSignableOperation({
      sender: defaultSender,
      signer: defaultSigner,
    });
  return {
    ...operation,
    typedSignature: await dolomiteMargin.signedOperations.signOperation(
      operation,
      SigningMethod.Hash,
    ),
  };
}

function expectLogs(txResult: TxResult, logTitles: string[]) {
  const logs = dolomiteMargin.logs.parseLogs(txResult);
  const actualTitles = logs
    .map((x: any) => x.name)
    .filter((x: string) => x !== 'LogIndexUpdate' && x !== 'LogOraclePrice');
  expect(actualTitles).to.eql(logTitles);
}

async function expectInvalid(operations: SignedOperation[]) {
  expect(
    await dolomiteMargin.signedOperations.getOperationsAreInvalid(operations),
  ).to.eql(Array(operations.length).fill(true));
}

async function expectValid(operations: SignedOperation[]) {
  expect(
    await dolomiteMargin.signedOperations.getOperationsAreInvalid(operations),
  ).to.eql(Array(operations.length).fill(false));
}
