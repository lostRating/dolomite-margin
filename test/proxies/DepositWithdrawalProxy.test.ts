import BigNumber from 'bignumber.js';
import { address, BalanceCheckFlag, Integer, INTEGERS, TxResult } from '../../src';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import { setupMarkets } from '../helpers/DolomiteMarginHelpers';
import { resetEVM, snapshot } from '../helpers/EVM';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';
import DolomiteMarginMath from '../../src/modules/DolomiteMarginMath';
import { expectThrow, expectThrowInvalidBalance } from '../helpers/Expect';

let dolomiteMargin: TestDolomiteMargin;
let accounts: address[];
let snapshotId: string;
let admin: address;
let user: address;
let market: Integer;
let ethMarket: Integer;

const zero = new BigNumber(0);
const par = new BigNumber('100');
const wei = new BigNumber('120'); // index == 1.2
const biggerPar = new BigNumber('110'); // forces the user to go negative by a little bit
const biggerWei = new BigNumber('132'); // forces the user to go negative by a little bit
const expectedNegativeBalancePar = par.minus(biggerPar);
const expectedNegativeBalanceWei = wei.minus(biggerWei);
const expectedNegativeWalletBalanceWei = wei.plus(biggerWei);
const expectedNegativeWalletBalancePar = par.plus(biggerPar);
const defaultAccountIndex = new BigNumber(0);
const otherAccountIndex = new BigNumber(123);
const defaultIsClosing = false;
const defaultIsRecyclable = false;
const defaultBalanceCheckFlag = BalanceCheckFlag.Both;

describe('DepositWithdrawalProxy', () => {
  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    accounts = r.accounts;
    admin = accounts[0];
    user = dolomiteMargin.getDefaultAccount();
    await resetEVM();
    await Promise.all([
      setupMarkets(dolomiteMargin, accounts),
      dolomiteMargin.testing.priceOracle.setPrice(dolomiteMargin.testing.tokenA.address, new BigNumber('1e40')),
      dolomiteMargin.testing.priceOracle.setPrice(dolomiteMargin.weth.address, new BigNumber('1e40')),
      dolomiteMargin.admin.setGlobalOperator(admin, true, { from: admin }),
    ]);
    await dolomiteMargin.admin.addMarket(
      dolomiteMargin.weth.address,
      dolomiteMargin.testing.priceOracle.address,
      dolomiteMargin.testing.interestSetter.address,
      zero,
      zero,
      zero,
      defaultIsClosing,
      defaultIsRecyclable,
      { from: admin },
    );

    market = await dolomiteMargin.getters.getMarketIdByTokenAddress(dolomiteMargin.testing.tokenA.address);
    ethMarket = await dolomiteMargin.getters.getMarketIdByTokenAddress(dolomiteMargin.weth.address);

    await dolomiteMargin.testing.setAccountBalance(user, defaultAccountIndex, market, par);
    await dolomiteMargin.testing.setAccountBalance(user, otherAccountIndex, market, par);
    await dolomiteMargin.testing.setAccountBalance(user, defaultAccountIndex, ethMarket, par);
    await dolomiteMargin.testing.setAccountBalance(user, otherAccountIndex, ethMarket, par);

    await dolomiteMargin.testing.tokenA.issueTo(wei, user);
    await dolomiteMargin.testing.tokenA.issueTo(wei.times(2), dolomiteMargin.address);

    await dolomiteMargin.weth.wrap(user, wei.times(3));
    await dolomiteMargin.weth.transfer(user, dolomiteMargin.address, wei.times(2));

    await dolomiteMargin.testing.tokenA.approve(dolomiteMargin.address, INTEGERS.MAX_UINT);

    const lastUpdateTimestamp = await dolomiteMargin.multiCall.getCurrentBlockTimestamp();
    await dolomiteMargin.testing.setMarketIndex(market, {
      borrow: new BigNumber('1.2'),
      supply: new BigNumber('1.2'),
      lastUpdate: lastUpdateTimestamp,
    });
    await dolomiteMargin.testing.setMarketIndex(ethMarket, {
      borrow: new BigNumber('1.1'),
      supply: new BigNumber('1.2'),
      lastUpdate: lastUpdateTimestamp,
    });
    const index = await dolomiteMargin.getters.getMarketCurrentIndex(market);
    expect(DolomiteMarginMath.parToWei(par, index)).to.eql(wei);
    snapshotId = await snapshot();
  });

  beforeEach(async () => {
    await resetEVM(snapshotId);
  });

  describe('default function', () => {
    it('should fail when ETH is sent to it (not from WETH contract)', async () => {
      await expectThrow(
        dolomiteMargin.web3.eth.sendTransaction({
          value: wei.toFixed(),
          to: dolomiteMargin.depositWithdrawalProxy.address,
          gas: '4000000',
        }),
        'DepositWithdrawalProxy: invalid ETH sender',
      );
    });
  });

  describe('depositWei', () => {
    it('should work normally', async () => {
      await dolomiteMargin.depositWithdrawalProxy.depositWei(otherAccountIndex, market, wei);
      await expectProtocolBalanceWei(otherAccountIndex, market, wei.times(2));
      await expectWalletBalanceWei(market, INTEGERS.ZERO);
    });

    it('should work when depositing max uint', async () => {
      await dolomiteMargin.depositWithdrawalProxy.depositWei(otherAccountIndex, market, INTEGERS.MAX_UINT);
      await expectProtocolBalanceWei(otherAccountIndex, market, wei.times(2));
      await expectWalletBalanceWei(market, INTEGERS.ZERO);
    });
  });

  describe('depositETH', () => {
    it('should work normally', async () => {
      await dolomiteMargin.depositWithdrawalProxy.initializeETHMarket(dolomiteMargin.weth.address);

      const balanceBefore = new BigNumber(await dolomiteMargin.web3.eth.getBalance(user));
      const txResult = await dolomiteMargin.depositWithdrawalProxy.depositETH(otherAccountIndex, wei);
      await expectProtocolBalanceWei(otherAccountIndex, ethMarket, wei.times(2));
      await expectETHBalanceInWei(txResult, balanceBefore, wei, false);
      await expectETHBalance(dolomiteMargin.depositWithdrawalProxy.address, INTEGERS.ZERO);
      await expectWETHBalance(dolomiteMargin.depositWithdrawalProxy.address, INTEGERS.ZERO);
    });

    it('should not work when not initialized', async () => {
      await expectThrow(
        dolomiteMargin.depositWithdrawalProxy.depositETH(otherAccountIndex, wei),
        'DepositWithdrawalProxy: not initialized',
      );
    });
  });

  describe('depositWeiIntoDefaultAccount', () => {
    it('should work normally', async () => {
      const txResult = await dolomiteMargin.depositWithdrawalProxy.depositWeiIntoDefaultAccount(market, wei);
      console.log('\tDeposit wei into default account gas used: ', txResult.gasUsed);
      await expectProtocolBalanceWei(defaultAccountIndex, market, wei.times(2));
      await expectWalletBalanceWei(market, INTEGERS.ZERO);
    });

    it('should work when depositing max uint', async () => {
      await dolomiteMargin.depositWithdrawalProxy.depositWeiIntoDefaultAccount(market, INTEGERS.MAX_UINT);
      await expectProtocolBalanceWei(defaultAccountIndex, market, wei.times(2));
      await expectWalletBalanceWei(market, INTEGERS.ZERO);
    });
  });

  describe('depositETHIntoDefaultAccount', () => {
    it('should work normally', async () => {
      await dolomiteMargin.depositWithdrawalProxy.initializeETHMarket(dolomiteMargin.weth.address);

      const balanceBefore = new BigNumber(await dolomiteMargin.web3.eth.getBalance(user));
      const txResult = await dolomiteMargin.depositWithdrawalProxy.depositETHIntoDefaultAccount(wei);
      await expectProtocolBalanceWei(defaultAccountIndex, ethMarket, wei.times(2));
      await expectETHBalanceInWei(txResult, balanceBefore, wei, false);
      await expectETHBalance(dolomiteMargin.depositWithdrawalProxy.address, INTEGERS.ZERO);
      await expectWETHBalance(dolomiteMargin.depositWithdrawalProxy.address, INTEGERS.ZERO);
    });

    it('should not work when not initialized', async () => {
      await expectThrow(
        dolomiteMargin.depositWithdrawalProxy.depositETHIntoDefaultAccount(wei),
        'DepositWithdrawalProxy: not initialized',
      );
    });
  });

  describe('withdrawWei', () => {
    it('should work normally', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawWei(otherAccountIndex, market, wei, defaultBalanceCheckFlag);
      await expectProtocolBalanceWei(otherAccountIndex, market, INTEGERS.ZERO);
      await expectWalletBalanceWei(market, wei.times(2));
    });

    it('should work when balanceCheckFlag is set to None and user goes negative', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawWei(otherAccountIndex, market, biggerWei, BalanceCheckFlag.None);
      await expectProtocolBalanceWei(otherAccountIndex, market, expectedNegativeBalanceWei);
      await expectWalletBalanceWei(market, expectedNegativeWalletBalanceWei);
    });

    it('should work when balanceCheckFlag is set to To and user goes negative', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawWei(otherAccountIndex, market, biggerWei, BalanceCheckFlag.To);
      await expectProtocolBalanceWei(otherAccountIndex, market, expectedNegativeBalanceWei);
      await expectWalletBalanceWei(market, expectedNegativeWalletBalanceWei);
    });

    it('should work when withdrawing max uint', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawWei(otherAccountIndex, market, INTEGERS.MAX_UINT, defaultBalanceCheckFlag);
      await expectProtocolBalanceWei(otherAccountIndex, market, INTEGERS.ZERO);
      await expectWalletBalanceWei(market, wei.times(2));
    });

    it('should not work when the user goes below zero with flag set', async () => {
      await expectThrowInvalidBalance(
        dolomiteMargin.depositWithdrawalProxy.withdrawWei(otherAccountIndex, market, biggerWei, defaultBalanceCheckFlag),
        user,
        otherAccountIndex,
        market
      );
      await expectThrowInvalidBalance(
        dolomiteMargin.depositWithdrawalProxy.withdrawWei(otherAccountIndex, market, biggerWei, BalanceCheckFlag.From),
        user,
        otherAccountIndex,
        market
      );
    });
  });

  describe('withdrawETH', () => {
    it('should work normally', async () => {
      await dolomiteMargin.depositWithdrawalProxy.initializeETHMarket(dolomiteMargin.weth.address);

      const balanceBefore = new BigNumber(await dolomiteMargin.web3.eth.getBalance(user));
      const txResult = await dolomiteMargin.depositWithdrawalProxy.withdrawETH(otherAccountIndex, wei, defaultBalanceCheckFlag);
      await expectProtocolBalanceWei(otherAccountIndex, ethMarket, INTEGERS.ZERO);
      await expectETHBalanceInWei(txResult, balanceBefore, wei, true);
      await expectETHBalance(dolomiteMargin.depositWithdrawalProxy.address, INTEGERS.ZERO);
      await expectWETHBalance(dolomiteMargin.depositWithdrawalProxy.address, INTEGERS.ZERO);
    });

    it('should work when withdrawing max uint', async () => {
      await dolomiteMargin.depositWithdrawalProxy.initializeETHMarket(dolomiteMargin.weth.address);

      const balanceBefore = new BigNumber(await dolomiteMargin.web3.eth.getBalance(user));
      const txResult = await dolomiteMargin.depositWithdrawalProxy.withdrawETH(
        otherAccountIndex,
        INTEGERS.MAX_UINT,
        defaultBalanceCheckFlag,
      );
      await expectProtocolBalanceWei(otherAccountIndex, ethMarket, INTEGERS.ZERO);
      await expectETHBalanceInWei(txResult, balanceBefore, wei, true);
      await expectETHBalance(dolomiteMargin.depositWithdrawalProxy.address, INTEGERS.ZERO);
      await expectWETHBalance(dolomiteMargin.depositWithdrawalProxy.address, INTEGERS.ZERO);
    });

    it('should work when balanceCheckFlag is set to None and user goes negative', async () => {
      await dolomiteMargin.depositWithdrawalProxy.initializeETHMarket(dolomiteMargin.weth.address);

      const balanceBefore = new BigNumber(await dolomiteMargin.web3.eth.getBalance(user));
      const txResult = await dolomiteMargin.depositWithdrawalProxy.withdrawETH(otherAccountIndex, biggerWei, BalanceCheckFlag.None);
      await expectProtocolBalanceWei(otherAccountIndex, ethMarket, expectedNegativeBalanceWei);
      await expectETHBalanceInWei(txResult, balanceBefore, biggerWei, true);
    });

    it('should work when balanceCheckFlag is set to To and user goes negative', async () => {
      await dolomiteMargin.depositWithdrawalProxy.initializeETHMarket(dolomiteMargin.weth.address);

      const balanceBefore = new BigNumber(await dolomiteMargin.web3.eth.getBalance(user));
      const txResult = await dolomiteMargin.depositWithdrawalProxy.withdrawETH(otherAccountIndex, biggerWei, BalanceCheckFlag.To);
      await expectProtocolBalanceWei(otherAccountIndex, ethMarket, expectedNegativeBalanceWei);
      await expectETHBalanceInWei(txResult, balanceBefore, biggerWei, true);
    });

    it('should not work when not initialized', async () => {
      await expectThrow(
        dolomiteMargin.depositWithdrawalProxy.withdrawETH(otherAccountIndex, INTEGERS.MAX_UINT, defaultBalanceCheckFlag),
        'DepositWithdrawalProxy: not initialized',
      );
    });

    it('should not work when the user goes below zero with flag set', async () => {
      await dolomiteMargin.depositWithdrawalProxy.initializeETHMarket(dolomiteMargin.weth.address);
      await expectThrowInvalidBalance(
        dolomiteMargin.depositWithdrawalProxy.withdrawETH(otherAccountIndex, biggerWei, defaultBalanceCheckFlag),
        user,
        otherAccountIndex,
        ethMarket,
      );
      await expectThrowInvalidBalance(
        dolomiteMargin.depositWithdrawalProxy.withdrawETH(otherAccountIndex, biggerWei, BalanceCheckFlag.From),
        user,
        otherAccountIndex,
        ethMarket,
      );
    });
  });

  describe('withdrawWeiFromDefaultAccount', () => {
    it('should work normally', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawWeiFromDefaultAccount(market, wei, defaultBalanceCheckFlag);
      await expectProtocolBalanceWei(defaultAccountIndex, market, INTEGERS.ZERO);
      await expectWalletBalanceWei(market, wei.times(2));
    });

    it('should work when withdrawing max uint', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawWeiFromDefaultAccount(
        market,
        INTEGERS.MAX_UINT,
        defaultBalanceCheckFlag,
      );
      await expectProtocolBalanceWei(defaultAccountIndex, market, INTEGERS.ZERO);
      await expectWalletBalanceWei(market, wei.times(2));
    });

    it('should work when balanceCheckFlag is set to None and user goes negative', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawWeiFromDefaultAccount(market, biggerWei, BalanceCheckFlag.None);
      await expectProtocolBalanceWei(defaultAccountIndex, market, expectedNegativeBalanceWei);
      await expectWalletBalanceWei(market, expectedNegativeWalletBalanceWei);
    });

    it('should work when balanceCheckFlag is set to To and user goes negative', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawWeiFromDefaultAccount(market, biggerWei, BalanceCheckFlag.To);
      await expectProtocolBalanceWei(defaultAccountIndex, market, expectedNegativeBalanceWei);
      await expectWalletBalanceWei(market, expectedNegativeWalletBalanceWei);
    });

    it('should not work when the user goes below zero with flag set', async () => {
      await expectThrowInvalidBalance(
        dolomiteMargin.depositWithdrawalProxy.withdrawWeiFromDefaultAccount(market, biggerWei, defaultBalanceCheckFlag),
        user,
        defaultAccountIndex,
        market,
      );
      await expectThrowInvalidBalance(
        dolomiteMargin.depositWithdrawalProxy.withdrawWeiFromDefaultAccount(market, biggerWei, BalanceCheckFlag.From),
        user,
        defaultAccountIndex,
        market,
      );
    });
  });

  describe('withdrawETHFromDefaultAccount', () => {
    it('should work normally', async () => {
      await dolomiteMargin.depositWithdrawalProxy.initializeETHMarket(dolomiteMargin.weth.address);

      const balanceBefore = new BigNumber(await dolomiteMargin.web3.eth.getBalance(user));
      const txResult = await dolomiteMargin.depositWithdrawalProxy.withdrawETHFromDefaultAccount(wei, defaultBalanceCheckFlag);
      await expectProtocolBalanceWei(defaultAccountIndex, ethMarket, INTEGERS.ZERO);
      await expectETHBalanceInWei(txResult, balanceBefore, wei, true);
      await expectETHBalance(dolomiteMargin.depositWithdrawalProxy.address, INTEGERS.ZERO);
      await expectWETHBalance(dolomiteMargin.depositWithdrawalProxy.address, INTEGERS.ZERO);
    });

    it('should work when withdrawing max uint', async () => {
      await dolomiteMargin.depositWithdrawalProxy.initializeETHMarket(dolomiteMargin.weth.address);

      const balanceBefore = new BigNumber(await dolomiteMargin.web3.eth.getBalance(user));
      const txResult = await dolomiteMargin.depositWithdrawalProxy.withdrawETHFromDefaultAccount(
        INTEGERS.MAX_UINT,
        defaultBalanceCheckFlag,
      );
      await expectProtocolBalanceWei(defaultAccountIndex, ethMarket, INTEGERS.ZERO);
      await expectETHBalanceInWei(txResult, balanceBefore, wei, true);
      await expectETHBalance(dolomiteMargin.depositWithdrawalProxy.address, INTEGERS.ZERO);
      await expectWETHBalance(dolomiteMargin.depositWithdrawalProxy.address, INTEGERS.ZERO);
    });

    it('should work when balanceCheckFlag is set to None and user goes negative', async () => {
      await dolomiteMargin.depositWithdrawalProxy.initializeETHMarket(dolomiteMargin.weth.address);

      const balanceBefore = new BigNumber(await dolomiteMargin.web3.eth.getBalance(user));
      const txResult = await dolomiteMargin.depositWithdrawalProxy.withdrawETHFromDefaultAccount(biggerWei, BalanceCheckFlag.None);
      await expectProtocolBalanceWei(defaultAccountIndex, ethMarket, expectedNegativeBalanceWei);
      await expectETHBalanceInWei(txResult, balanceBefore, biggerWei, true);
    });

    it('should work when balanceCheckFlag is set to To and user goes negative', async () => {
      await dolomiteMargin.depositWithdrawalProxy.initializeETHMarket(dolomiteMargin.weth.address);

      const balanceBefore = new BigNumber(await dolomiteMargin.web3.eth.getBalance(user));
      const txResult = await dolomiteMargin.depositWithdrawalProxy.withdrawETHFromDefaultAccount(biggerWei, BalanceCheckFlag.To);
      await expectProtocolBalanceWei(defaultAccountIndex, ethMarket, expectedNegativeBalanceWei);
      await expectETHBalanceInWei(txResult, balanceBefore, biggerWei, true);
    });

    it('should not work when the user goes below zero with flag set', async () => {
      await dolomiteMargin.depositWithdrawalProxy.initializeETHMarket(dolomiteMargin.weth.address);

      await expectThrowInvalidBalance(
        dolomiteMargin.depositWithdrawalProxy.withdrawETHFromDefaultAccount(biggerWei, defaultBalanceCheckFlag),
        user,
        defaultAccountIndex,
        ethMarket,
      );
      await expectThrowInvalidBalance(
        dolomiteMargin.depositWithdrawalProxy.withdrawETHFromDefaultAccount(biggerWei, BalanceCheckFlag.From),
        user,
        defaultAccountIndex,
        ethMarket,
      );
    });
  });

  describe('depositPar', () => {
    it('should work normally', async () => {
      await dolomiteMargin.depositWithdrawalProxy.depositPar(otherAccountIndex, market, par);
      await expectProtocolBalancePar(otherAccountIndex, market, par.times(2));
      await expectWalletBalancePar(market, INTEGERS.ZERO);
    });

    it('should not work when depositing max uint', async () => {
      await expectThrow(dolomiteMargin.depositWithdrawalProxy.depositPar(otherAccountIndex, market, INTEGERS.MAX_UINT));
    });
  });

  describe('depositParIntoDefaultAccount', () => {
    it('should work normally', async () => {
      await dolomiteMargin.depositWithdrawalProxy.depositParIntoDefaultAccount(market, par);
      await expectProtocolBalancePar(defaultAccountIndex, market, par.times(2));
      await expectWalletBalancePar(market, INTEGERS.ZERO);
    });

    it('should work when depositing max uint', async () => {
      await expectThrow(dolomiteMargin.depositWithdrawalProxy.depositParIntoDefaultAccount(market, INTEGERS.MAX_UINT));
    });
  });

  describe('withdrawPar', () => {
    it('should work normally', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawPar(otherAccountIndex, market, par, defaultBalanceCheckFlag);
      await expectProtocolBalancePar(otherAccountIndex, market, INTEGERS.ZERO);
      await expectWalletBalancePar(market, par.times(2));
    });

    it('should work when withdrawing max uint', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawPar(otherAccountIndex, market, INTEGERS.MAX_UINT, defaultBalanceCheckFlag);
      await expectProtocolBalancePar(otherAccountIndex, market, INTEGERS.ZERO);
      await expectWalletBalancePar(market, par.times(2));
    });

    it('should work when balanceCheckFlag is set to None and user goes negative', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawPar(otherAccountIndex, market, biggerPar, BalanceCheckFlag.None);
      await expectProtocolBalancePar(otherAccountIndex, market, expectedNegativeBalancePar);
      await expectWalletBalancePar(market, expectedNegativeWalletBalancePar);
    });

    it('should work when balanceCheckFlag is set to To and user goes negative', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawPar(otherAccountIndex, market, biggerPar, BalanceCheckFlag.To);
      await expectProtocolBalancePar(otherAccountIndex, market, expectedNegativeBalancePar);
      await expectWalletBalancePar(market, expectedNegativeWalletBalancePar);
    });

    it('should not work when the user goes below zero with flag set', async () => {
      await expectThrowInvalidBalance(
        dolomiteMargin.depositWithdrawalProxy.withdrawPar(otherAccountIndex, market, biggerPar, defaultBalanceCheckFlag),
        user,
        otherAccountIndex,
        market
      );
      await expectThrowInvalidBalance(
        dolomiteMargin.depositWithdrawalProxy.withdrawPar(otherAccountIndex, market, biggerPar, BalanceCheckFlag.From),
        user,
        otherAccountIndex,
        market
      );
    });
  });

  describe('withdrawParFromDefaultAccount', () => {
    it('should work normally', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawParFromDefaultAccount(market, par, defaultBalanceCheckFlag);
      await expectProtocolBalancePar(defaultAccountIndex, market, INTEGERS.ZERO);
      await expectWalletBalancePar(market, par.times(2));
    });

    it('should work when withdrawing max uint', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawParFromDefaultAccount(
        market,
        INTEGERS.MAX_UINT,
        defaultBalanceCheckFlag,
      );
      await expectProtocolBalancePar(defaultAccountIndex, market, INTEGERS.ZERO);
      await expectWalletBalancePar(market, par.times(2));
    });

    it('should work when balanceCheckFlag is set to None and user goes negative', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawParFromDefaultAccount(market, biggerPar, BalanceCheckFlag.None);
      await expectProtocolBalancePar(defaultAccountIndex, market, expectedNegativeBalancePar);
      await expectWalletBalancePar(market, expectedNegativeWalletBalancePar);
    });

    it('should work when balanceCheckFlag is set to To and user goes negative', async () => {
      await dolomiteMargin.depositWithdrawalProxy.withdrawParFromDefaultAccount(market, biggerPar, BalanceCheckFlag.To);
      await expectProtocolBalancePar(defaultAccountIndex, market, expectedNegativeBalancePar);
      await expectWalletBalancePar(market, expectedNegativeWalletBalancePar);
    });

    it('should not work when the user goes below zero with flag set', async () => {
      await expectThrowInvalidBalance(
        dolomiteMargin.depositWithdrawalProxy.withdrawParFromDefaultAccount(market, biggerPar, defaultBalanceCheckFlag),
        user,
        defaultAccountIndex,
        market
      );
      await expectThrowInvalidBalance(
        dolomiteMargin.depositWithdrawalProxy.withdrawParFromDefaultAccount(market, biggerPar, BalanceCheckFlag.From),
        user,
        defaultAccountIndex,
        market
      );
    });
  });

  // ========================= Helper Functions =========================

  async function expectProtocolBalanceWei(accountIndex: Integer, market: Integer, amountWei: Integer): Promise<void> {
    const balance = await dolomiteMargin.getters.getAccountWei(user, accountIndex, market);
    expect(balance).to.eql(amountWei);
  }

  async function expectProtocolBalancePar(accountIndex: Integer, market: Integer, amountPar: Integer): Promise<void> {
    const balance = await dolomiteMargin.getters.getAccountPar(user, accountIndex, market);
    expect(balance).to.eql(amountPar);
  }

  async function expectWalletBalanceWei(market: Integer, amount: Integer): Promise<void> {
    const balance = await dolomiteMargin.testing.tokenA.getBalance(user);
    expect(balance).to.eql(amount);
  }

  async function expectETHBalanceInWei(
    txResult: TxResult,
    balanceBefore: Integer,
    amount: Integer,
    isWithdrawal: boolean,
  ): Promise<void> {
    const tx = await dolomiteMargin.web3.eth.getTransaction(txResult.transactionHash);
    const balance = new BigNumber(await dolomiteMargin.web3.eth.getBalance(user));
    const balanceWithoutFees = balance.plus(new BigNumber(txResult.gasUsed).times(new BigNumber(tx.gasPrice)));
    expect(balanceWithoutFees).to.eql(isWithdrawal ? balanceBefore.plus(amount) : balanceBefore.minus(amount));
  }

  async function expectETHBalance(
    owner: address,
    amount: Integer,
  ): Promise<void> {
    const balance = new BigNumber(await dolomiteMargin.web3.eth.getBalance(owner));
    expect(balance).to.eql(amount);
  }

  async function expectWETHBalance(
    owner: address,
    amount: Integer,
  ): Promise<void> {
    expect(await dolomiteMargin.weth.getBalance(owner)).to.eql(amount);
  }

  async function expectWalletBalancePar(market: Integer, amount: Integer): Promise<void> {
    const balance = await dolomiteMargin.testing.tokenA.getBalance(user);
    const index = await dolomiteMargin.getters.getMarketCurrentIndex(market);
    expect(balance).to.eql(DolomiteMarginMath.parToWei(amount, index));
  }
});
