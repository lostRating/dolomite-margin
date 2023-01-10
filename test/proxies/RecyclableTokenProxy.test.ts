import BigNumber from 'bignumber.js';

import CustomTestTokenJSON from '../../build/contracts/CustomTestToken.json';
import RecyclableTokenProxyJSON from '../../build/contracts/TestRecyclableToken.json';
import TestTraderJSON from '../../build/contracts/TestTrader.json';
import ErroringTokenJSON from '../../build/contracts/ErroringToken.json';

import { CustomTestToken } from '../../build/testing_wrappers/CustomTestToken';
import { TestRecyclableToken } from '../../build/testing_wrappers/TestRecyclableToken';
import { TestTrader } from '../../build/testing_wrappers/TestTrader';
import {
  address,
  Amount,
  AmountDenomination,
  AmountReference,
  Integer,
  INTEGERS,
  TxResult,
} from '../../src';
import { toBytes, toBytesNoPadding } from '../../src/lib/BytesHelper';
import { expectThrow } from '../helpers/Expect';
import { deployContract } from '../helpers/Deploy';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import { setupMarkets } from '../helpers/DolomiteMarginHelpers';
import { resetEVM, snapshot } from '../helpers/EVM';
import { EVM } from '../modules/EVM';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';
import { RecyclableTokenProxy } from '../../src/modules/RecyclableTokenProxy';
import { ErroringToken } from '../../build/testing_wrappers/ErroringToken';
import { ethers } from 'ethers';

let dolomiteMargin: TestDolomiteMargin;
let accounts: address[];
let admin: address;
let user: address;
let liquidator: address;
let oracleAddress: address;
let setterAddress: address;
let borrowTokenAddress: address;
let customToken: CustomTestToken;
let recyclableToken: RecyclableTokenProxy;
let testTrader: TestTrader;
let marketId: Integer;

const currentTimestamp = new BigNumber(Math.floor(new Date().getTime() / 1000));
const defaultExpiryTimeDelta = new BigNumber(3600); // 1 hour
const defaultExpirationTimestamp = currentTimestamp.plus(defaultExpiryTimeDelta);
const maxExpirationTimestamp = currentTimestamp.plus(86400); // expires in 1 day
const defaultIsOpen = true;

const borrowMarketId: Integer = INTEGERS.ZERO;
const defaultPrice = new BigNumber('1e36');

describe('RecyclableTokenProxy', () => {
  let snapshotId: string;

  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    accounts = r.accounts;
    admin = accounts[0];
    user = accounts[2];
    liquidator = accounts[3];
    expect(admin).not.to.eql(user);

    await resetEVM();

    await Promise.all([setupMarkets(dolomiteMargin, accounts, 3)]);

    oracleAddress = dolomiteMargin.testing.priceOracle.address;
    setterAddress = dolomiteMargin.testing.interestSetter.address;

    customToken = await deployContract(dolomiteMargin, CustomTestTokenJSON, [
      'TestToken',
      'TST',
      '18',
    ]) as CustomTestToken;

    recyclableToken = await addMarket(customToken, maxExpirationTimestamp);
    marketId = await recyclableToken.marketId();
    borrowTokenAddress = await dolomiteMargin.getters.getMarketTokenAddress(borrowMarketId);

    const borrowToken = new dolomiteMargin.web3.eth.Contract(
      CustomTestTokenJSON.abi,
      borrowTokenAddress,
    ) as CustomTestToken;

    await dolomiteMargin.contracts.callContractFunction(
      borrowToken.methods.setBalance(dolomiteMargin.address, '1000000'),
      { from: admin },
    );

    // set the price to be 100 times less than the recyclable price.
    await dolomiteMargin.testing.priceOracle.setPrice(borrowTokenAddress, defaultPrice);

    testTrader = (await deployContract(dolomiteMargin, TestTraderJSON, [dolomiteMargin.address])) as TestTrader;

    snapshotId = await snapshot();
  });

  beforeEach(async () => {
    await resetEVM(snapshotId);
  });

  // ============ Token Functions ============

  describe('#initialize', () => {
    it('Should fail if recycled and initialized again', async () => {
      await removeMarket(marketId, recyclableToken.address);
      await expectThrow(
        dolomiteMargin.admin.addMarket(
          recyclableToken.address,
          oracleAddress,
          setterAddress,
          INTEGERS.ZERO,
          INTEGERS.ZERO,
          INTEGERS.ZERO,
          true,
          true,
          { from: admin },
        ),
        'RecyclableTokenProxy: already initialized',
      );
    });

    it('Should fail if recycled and attempt to recycle again', async () => {
      await removeMarket(marketId, recyclableToken.address);
      expect(await recyclableToken.isRecycled()).to.eql(true);
      await expectThrow(
        dolomiteMargin.operation.initiate()
          .call({
            primaryAccountOwner: user,
            primaryAccountId: INTEGERS.ZERO,
            callee: recyclableToken.address,
            data: toBytesNoPadding(ethers.utils.defaultAbiCoder.encode(['uint256', 'bytes'], ['1', '0x'])),
          })
          .commit({ from: user }),
        'RecyclableTokenProxy: already recycled',
      );
    });

    it('Should fail if market is not closing', async () => {
      const isClosing = false;
      await expectThrow(
        addMarket(customToken, defaultExpirationTimestamp, isClosing),
        'RecyclableTokenProxy: market cannot allow borrowing',
      );
    });
  });

  describe('#transfer', () => {
    it('Should fail if recycled and attempt to recycle again', async () => {
      await removeMarket(marketId, recyclableToken.address);
      expect(await recyclableToken.isRecycled()).to.eql(true);
      await expectThrow(
        dolomiteMargin.operation.initiate()
          .call({
            primaryAccountOwner: user,
            primaryAccountId: INTEGERS.ZERO,
            callee: recyclableToken.address,
            data: toBytesNoPadding(ethers.utils.defaultAbiCoder.encode(
              ['uint256', 'bytes'],
              ['2', ethers.utils.defaultAbiCoder.encode(['uint'], ['420'])],
              )),
          })
          .commit({ from: user }),
        'RecyclableTokenProxy: cannot transfer while recycled',
      );
    });
  });

  describe('#transferFrom', () => {
    function encodeTransferFrom(from: address, to: address, amount: Integer): number[][] {
      return toBytesNoPadding(
        ethers.utils.defaultAbiCoder.encode(
          ['uint256', 'bytes'],
          ['3', ethers.utils.defaultAbiCoder.encode(['address', 'address', 'uint256'], [from, to, amount.toFixed()])],
        )
      );
    }

    it('Should fail if recycled and attempt to transferFrom again', async () => {
      await removeMarket(marketId, recyclableToken.address);
      expect(await recyclableToken.isRecycled()).to.eql(true);
      await expectThrow(
        dolomiteMargin.operation.initiate()
          .call({
            primaryAccountOwner: user,
            primaryAccountId: INTEGERS.ZERO,
            callee: recyclableToken.address,
            data: encodeTransferFrom(recyclableToken.address, dolomiteMargin.address, INTEGERS.ONE),
          })
          .commit({ from: user }),
        'RecyclableTokenProxy: cannot transfer while recycled',
      );
    });

    it('Should fail if recipient is not DolomiteMargin', async () => {
      await expectThrow(
        dolomiteMargin.operation.initiate()
          .call({
            primaryAccountOwner: user,
            primaryAccountId: INTEGERS.ZERO,
            callee: recyclableToken.address,
            data: encodeTransferFrom(recyclableToken.address, user, INTEGERS.ONE),
          })
          .commit({ from: user }),
        'RecyclableTokenProxy: invalid recipient',
      );
    });

    it('Should fail if underlying balance is insufficient for ordinary transfer into DolomiteMargin', async () => {
      await expectThrow(
        dolomiteMargin.operation.initiate()
          .call({
            primaryAccountOwner: user,
            primaryAccountId: INTEGERS.ZERO,
            callee: recyclableToken.address,
            data: encodeTransferFrom(recyclableToken.address, dolomiteMargin.address, INTEGERS.MAX_UINT_128),
          })
          .commit({ from: user }),
        'RecyclableTokenProxy: insufficient balance for deposit',
      );
    });
  });

  describe('#name', () => {
    it('Successfully gets the total supply', async () => {
      expect(await recyclableToken.name()).to.eql('Recyclable: TestToken');
      const errorToken = await deployContract(dolomiteMargin, ErroringTokenJSON, []) as ErroringToken;
      const errorRecyclableToken = await addMarket(errorToken);
      expect(await errorRecyclableToken.name()).to.eql('Recyclable: Dolomite Token');
    });
  });

  describe('#symbol', () => {
    it('Successfully gets the total supply', async () => {
      expect(await recyclableToken.symbol()).to.eql('rTST');
      const errorToken = await deployContract(dolomiteMargin, ErroringTokenJSON, []) as ErroringToken;
      const errorRecyclableToken = await addMarket(errorToken);
      expect(await errorRecyclableToken.symbol()).to.eql('rDOLO_TOKEN');
    });
  });

  describe('#decimals', () => {
    it('Successfully gets the total supply', async () => {
      expect(await recyclableToken.decimals()).to.eql(18);
      const errorToken = await deployContract(dolomiteMargin, ErroringTokenJSON, []) as ErroringToken;
      const errorRecyclableToken = await addMarket(errorToken);
      expect(await errorRecyclableToken.decimals()).to.eql(18);
    });
  });

  describe('#totalSupply', () => {
    it('Successfully gets the total supply', async () => {
      const rawTotalSupply = await customToken.methods.totalSupply().call();
      expect(await recyclableToken.totalSupply()).to.eql(new BigNumber(rawTotalSupply));
    });
  });

  describe('#approve and #allowance', () => {
    it('Successfully does nothing', async () => {
      await recyclableToken.approve(dolomiteMargin.address, INTEGERS.MAX_UINT.toFixed());
      const allowance = await recyclableToken.allowance(user, dolomiteMargin.address);
      expect(new BigNumber(allowance)).to.eql(INTEGERS.ZERO);
    });
  });

  describe('#getAccountNumber', () => {
    it('Successfully gets the account number', async () => {
      const userAccountNumber = new BigNumber(1);
      const accountNumber = await recyclableToken.getAccountNumber(user, userAccountNumber);
      const created = dolomiteMargin.web3.utils.keccak256(
        dolomiteMargin.web3.eth.abi.encodeParameters(['address', 'uint256'], [user, userAccountNumber.toFixed()]),
      );
      expect(accountNumber.toFixed()).to.eql(dolomiteMargin.web3.utils.hexToNumberString(created));
    });
  });

  describe('#depositIntoDolomiteMargin', () => {
    it('Successfully deposits into DolomiteMargin', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(0);
      const balance = new BigNumber(100);
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, balance.toFixed()), tx);
      await recyclableToken.depositIntoDolomiteMargin(accountNumber, balance, tx);
      expect(await recyclableToken.getAccountPar(user, accountNumber)).to.eql(balance);
      expect(await recyclableToken.balanceOf(user)).to.eql(balance);
      expect(await recyclableToken.balanceOf(dolomiteMargin.address)).to.eql(balance);
    });

    it('Successfully deposits into DolomiteMargin with random account number', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(132);
      const balance = new BigNumber(100);
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, balance.toFixed()), tx);
      await recyclableToken.depositIntoDolomiteMargin(accountNumber, balance, tx);
      expect(await recyclableToken.getAccountPar(user, accountNumber)).to.eql(balance);
    });

    it('Fails to deposit when contract is expired', async () => {
      const accountNumber = new BigNumber(132);
      const balance = new BigNumber(100);
      await expireMarket();
      await expectThrow(
        recyclableToken.depositIntoDolomiteMargin(accountNumber, balance, { from: user }),
        `RecyclableTokenProxy: market is expired <${maxExpirationTimestamp.toFixed()}>`,
      );
    });

    it('Fails to deposit when recycled', async () => {
      const accountNumber = new BigNumber(132);
      const balance = new BigNumber(100);
      await removeMarket(marketId, recyclableToken.address);
      await expectThrow(
        recyclableToken.depositIntoDolomiteMargin(accountNumber, balance, { from: user }),
        'RecyclableTokenProxy: cannot deposit when recycled',
      );
    });

    it('Fails to deposit when approval is not set for underlying token with recyclable spender', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(132);
      const balance = new BigNumber(100);
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, balance.toFixed()), tx);
      await expectThrow(
        recyclableToken.depositIntoDolomiteMargin(accountNumber, balance, tx),
        'SafeERC20: low-level call failed',
      );
    });
  });

  describe('#withdrawFromDolomiteMargin', () => {
    it('Successfully withdraws from DolomiteMargin', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(0);
      const balance = new BigNumber(100);
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, balance.toFixed()), tx);
      await recyclableToken.depositIntoDolomiteMargin(accountNumber, balance, tx);
      await recyclableToken.withdrawFromDolomiteMargin(accountNumber, balance.minus(10), tx);
      expect(await recyclableToken.getAccountPar(user, accountNumber)).to.eql(new BigNumber(10));
      expect(await dolomiteMargin.contracts.callConstantContractFunction(
        customToken.methods.balanceOf(user)
      )).to.eql((balance.minus(10)).toString());
    });

    it('Fails to withdraw when in recycled state', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(132);
      const balance = new BigNumber(100);
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, balance.toFixed()), tx);
      await recyclableToken.depositIntoDolomiteMargin(accountNumber, balance, tx);
      await removeMarket(marketId, recyclableToken.address);
      await expectThrow(
        recyclableToken.withdrawFromDolomiteMargin(accountNumber, balance, tx),
        'RecyclableTokenProxy: cannot withdraw when recycled',
      );
    });
  });

  describe('#withdrawAfterRecycle', () => {
    it('Successfully withdraws when in recycled state', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(0);
      const balance = new BigNumber(100);
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.setBalance(user, balance.toFixed()),
        tx,
      );
      await recyclableToken.depositIntoDolomiteMargin(accountNumber, balance, tx);
      await removeMarket(marketId, recyclableToken.address);
      expect(await dolomiteMargin.contracts.callConstantContractFunction(
        customToken.methods.balanceOf(user)
      )).to.eql('0');
      await recyclableToken.withdrawAfterRecycle(accountNumber, tx);
      expect(await dolomiteMargin.contracts.callConstantContractFunction(
        customToken.methods.balanceOf(user)
      )).to.eql(balance.toString());
      expect(await recyclableToken.getAccountPar(user, accountNumber)).to.eql(INTEGERS.ZERO);
      expect(await recyclableToken.balanceOf(user)).to.eql(INTEGERS.ZERO);

      // We should be able to add a market using a recycled market ID
      const latestBlock = await dolomiteMargin.web3.eth.getBlock('latest');
      const expirationTimestamp = new BigNumber(latestBlock.timestamp + 86400);
      const _newRecyclableToken = await addMarket(customToken, expirationTimestamp);
      expect(await dolomiteMargin.getters.getMarketIdByTokenAddress(_newRecyclableToken.address)).to.eql(marketId);
    });

    it('Fails to withdraw twice to the same address in a recycled state', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(0);
      const balance = new BigNumber(100);
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, balance.toFixed()), tx);
      await recyclableToken.depositIntoDolomiteMargin(accountNumber, balance, tx);
      await removeMarket(marketId, recyclableToken.address);
      expect(await dolomiteMargin.contracts.callConstantContractFunction(
        customToken.methods.balanceOf(user)
      )).to.eql('0');
      await recyclableToken.withdrawAfterRecycle(accountNumber, tx);
      expect(await dolomiteMargin.contracts.callConstantContractFunction(
        customToken.methods.balanceOf(user)
      )).to.eql(balance.toString());
      await expectThrow(
        recyclableToken.withdrawAfterRecycle(accountNumber, tx),
        'RecyclableTokenProxy: user already withdrew',
      );
    });

    it('Fails to withdraw when not in recycled state', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(0);
      await expectThrow(
        recyclableToken.withdrawAfterRecycle(accountNumber, tx),
        'RecyclableTokenProxy: not recycled yet',
      );
    });
  });

  describe('#trade', () => {
    it('Successfully trades with test wrapper', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(0);
      const supplyBalancePar = new BigNumber(100);
      const borrowBalanceWei = new BigNumber(20);
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.setBalance(user, supplyBalancePar.toFixed()),
        tx,
      );
      await recyclableToken.depositIntoDolomiteMargin(accountNumber, supplyBalancePar, tx);
      expect(await recyclableToken.getAccountPar(user, accountNumber)).to.eql(new BigNumber(supplyBalancePar));
      expect(await getBorrowBalance(user, accountNumber, borrowMarketId)).to.eql(INTEGERS.ZERO);

      const txResult = await recyclableToken.trade(
        accountNumber,
        { sign: true, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
        borrowTokenAddress,
        { sign: false, denomination: AmountDenomination.Wei, ref: AmountReference.Delta, value: borrowBalanceWei },
        testTrader.options.address,
        defaultExpiryTimeDelta,
        defaultIsOpen,
        toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
        tx
      );
      const block = await dolomiteMargin.web3.eth.getBlock(txResult.blockNumber);

      expect(await recyclableToken.getAccountPar(user, accountNumber)).to.eql(supplyBalancePar.plus(supplyBalancePar));
      expect(await getBorrowBalance(user, accountNumber, borrowMarketId)).to.eql(borrowBalanceWei.negated());
      const recyclableAccount = await recyclableToken.getAccountNumber(user, accountNumber);
      expect(
        await dolomiteMargin.expiry.getExpiry(
          recyclableToken.address,
          new BigNumber(recyclableAccount),
          borrowMarketId,
        ),
      ).to.eql(new BigNumber(block.timestamp).plus(defaultExpiryTimeDelta));
    });

    it('Successfully closes a position via a trade with test wrapper', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(0);
      const supplyBalancePar = new BigNumber(100);
      const borrowBalanceWei = new BigNumber(20);
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.setBalance(user, supplyBalancePar.toFixed()),
        tx,
      );
      await recyclableToken.depositIntoDolomiteMargin(accountNumber, supplyBalancePar, tx);
      expect(await recyclableToken.getAccountPar(user, accountNumber)).to.eql(new BigNumber(supplyBalancePar));
      expect(await getBorrowBalance(user, accountNumber, borrowMarketId)).to.eql(INTEGERS.ZERO);

      const txResult = await recyclableToken.trade(
        accountNumber,
        { sign: true, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
        borrowTokenAddress,
        { sign: false, denomination: AmountDenomination.Wei, ref: AmountReference.Delta, value: borrowBalanceWei },
        testTrader.options.address,
        defaultExpiryTimeDelta,
        defaultIsOpen,
        toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
        tx,
      );
      const block = await dolomiteMargin.web3.eth.getBlock(txResult.blockNumber);

      expect(await recyclableToken.getAccountPar(user, accountNumber)).to.eql(supplyBalancePar.plus(supplyBalancePar));
      expect(await getBorrowBalance(user, accountNumber, borrowMarketId)).to.eql(new BigNumber(-borrowBalanceWei));
      const recyclableAccount = await recyclableToken.getAccountNumber(user, accountNumber);
      expect(
        await dolomiteMargin.expiry.getExpiry(
          recyclableToken.address,
          new BigNumber(recyclableAccount),
          borrowMarketId,
        ),
      ).to.eql(new BigNumber(block.timestamp).plus(defaultExpiryTimeDelta));

      await recyclableToken.trade(
        accountNumber,
        { sign: false, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
        borrowTokenAddress,
        { sign: false, denomination: AmountDenomination.Wei, ref: AmountReference.Target, value: INTEGERS.ZERO },
        testTrader.options.address,
        defaultExpiryTimeDelta,
        !defaultIsOpen,
        toBytes(borrowBalanceWei, supplyBalancePar, !defaultIsOpen),
        tx,
      );
    });

    it('Fails to trade when recyclable contract is expired', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(132);
      const supplyBalancePar = new BigNumber(100);
      const borrowBalanceWei = new BigNumber(supplyBalancePar.div(10));
      await expireMarket();
      await expectThrow(
        recyclableToken.trade(
          accountNumber,
          { sign: true, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
          borrowTokenAddress,
          { sign: false, denomination: AmountDenomination.Wei, ref: AmountReference.Delta, value: borrowBalanceWei },
          testTrader.options.address,
          defaultExpiryTimeDelta,
          defaultIsOpen,
          toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
          tx,
        ),
        `RecyclableTokenProxy: market is expired <${maxExpirationTimestamp.toFixed()}>`,
      );
    });

    it('Fails to trade when recyclable contract expiration timestamp is invalid', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(132);
      const supplyBalancePar = new BigNumber(100);
      const borrowBalanceWei = new BigNumber(supplyBalancePar.div(10));
      const invalidExpiryDelta = new BigNumber('1231231231233123123');
      await expectThrow(
        recyclableToken.trade(
          accountNumber,
          { sign: true, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
          borrowTokenAddress,
          {
            sign: false,
            denomination: AmountDenomination.Wei,
            ref: AmountReference.Delta,
            value: borrowBalanceWei,
          },
          testTrader.options.address,
          invalidExpiryDelta,
          defaultIsOpen,
          toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
          tx,
        ),
        `RecyclableTokenProxy: expiration time delta invalid <${invalidExpiryDelta.toFixed()}>`,
      );
    });

    it('Fails to trade when in recycled state', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(132);
      const supplyBalancePar = new BigNumber(100);
      await removeMarket(marketId, recyclableToken.address);
      const borrowBalanceWei = new BigNumber(supplyBalancePar.div(10));
      await expectThrow(
        recyclableToken.trade(
          accountNumber,
          { sign: true, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
          borrowTokenAddress,
          {
            sign: false,
            denomination: AmountDenomination.Wei,
            ref: AmountReference.Delta,
            value: borrowBalanceWei,
          },
          testTrader.options.address,
          defaultExpiryTimeDelta,
          defaultIsOpen,
          toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
          tx,
        ),
        'RecyclableTokenProxy: cannot trade when recycled',
      );
    });

    it('Fails to trade when position would be under collateralized', async () => {
      const tx = {
        from: user,
      };
      const outerAccountNumber = new BigNumber(132);
      const innerAccountNumber = await recyclableToken.getAccountNumber(user, outerAccountNumber);
      const supplyBalancePar = new BigNumber(100);
      const borrowBalanceWei = new BigNumber(100);
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.setBalance(user, supplyBalancePar.toFixed()),
        tx,
      );
      await recyclableToken.depositIntoDolomiteMargin(outerAccountNumber, supplyBalancePar, tx);
      await expectThrow(
        recyclableToken.trade(
          outerAccountNumber,
          { sign: true, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
          borrowTokenAddress,
          {
            sign: false,
            denomination: AmountDenomination.Wei,
            ref: AmountReference.Delta,
            value: borrowBalanceWei,
          },
          testTrader.options.address,
          defaultExpiryTimeDelta,
          defaultIsOpen,
          toBytes(supplyBalancePar.div(10), borrowBalanceWei, defaultIsOpen),
          tx,
        ),
        `OperationImpl: Undercollateralized account <${recyclableToken.address.toLowerCase()}, ${innerAccountNumber}>`,
      );
    });
  });

  describe('#liquidate', () => {
    it('Successfully liquidates when a user is undercollateralized and liquidator withdraws', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(0);
      const supplyBalancePar = new BigNumber(100);
      const borrowBalanceWei = new BigNumber(100);
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.setBalance(user, supplyBalancePar.toFixed()),
        tx,
      );
      await recyclableToken.depositIntoDolomiteMargin(accountNumber, supplyBalancePar, tx);
      expect(await recyclableToken.getAccountPar(user, accountNumber)).to.eql(new BigNumber(supplyBalancePar));
      expect(await getBorrowBalance(user, accountNumber, borrowMarketId)).to.eql(INTEGERS.ZERO);

      await recyclableToken.trade(
        accountNumber,
        { sign: true, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
        borrowTokenAddress,
        { sign: false, denomination: AmountDenomination.Wei, ref: AmountReference.Delta, value: borrowBalanceWei },
        testTrader.options.address,
        defaultExpiryTimeDelta,
        defaultIsOpen,
        toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
        tx,
      );

      await dolomiteMargin.testing.priceOracle.setPrice(
        borrowTokenAddress,
        new BigNumber('1740000000000000000000000000000000000'),
      );

      await dolomiteMargin.testing.setAccountBalance(
        liquidator,
        INTEGERS.ZERO,
        borrowMarketId,
        new BigNumber(borrowBalanceWei),
        { from: liquidator },
      );

      const liquidAccountId = await recyclableToken.getAccountNumber(user, accountNumber);

      const defaultAmount: Amount = {
        value: INTEGERS.ZERO,
        denomination: AmountDenomination.Principal,
        reference: AmountReference.Target,
      };

      // Only global operators can be liquidators
      await dolomiteMargin.admin.setGlobalOperator(liquidator, true, {
        from: admin,
      });

      await dolomiteMargin.operation
        .initiate()
        .liquidate({
          primaryAccountOwner: liquidator,
          primaryAccountId: INTEGERS.ZERO,
          liquidMarketId: borrowMarketId,
          payoutMarketId: marketId,
          liquidAccountOwner: recyclableToken.address,
          liquidAccountId: new BigNumber(liquidAccountId),
          amount: defaultAmount,
        })
        .withdraw({
          marketId,
          primaryAccountOwner: liquidator,
          primaryAccountId: INTEGERS.ZERO,
          amount: defaultAmount,
          to: liquidator,
        })
        .commit({ from: liquidator });
    });

    it('Fails to liquidate if the liquidator keeps the collateral in DolomiteMargin', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = new BigNumber(0);
      const supplyBalancePar = new BigNumber(100);
      const borrowBalanceWei = new BigNumber(100);
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.setBalance(user, supplyBalancePar.toFixed()),
        tx,
      );
      await recyclableToken.depositIntoDolomiteMargin(accountNumber, supplyBalancePar, tx);
      expect(await recyclableToken.getAccountPar(user, accountNumber)).to.eql(supplyBalancePar);
      expect(await getBorrowBalance(user, accountNumber, borrowMarketId)).to.eql(INTEGERS.ZERO);

      await recyclableToken.trade(
        accountNumber,
        { sign: true, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
        borrowTokenAddress,
        { sign: false, denomination: AmountDenomination.Wei, ref: AmountReference.Delta, value: borrowBalanceWei },
        testTrader.options.address,
        defaultExpiryTimeDelta,
        defaultIsOpen,
        toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
        tx,
      );

      await dolomiteMargin.testing.priceOracle.setPrice(
        borrowTokenAddress,
        new BigNumber('1740000000000000000000000000000000000'),
      );

      await dolomiteMargin.testing.setAccountBalance(
        liquidator,
        INTEGERS.ZERO,
        borrowMarketId,
        borrowBalanceWei,
        { from: liquidator },
      );

      const liquidAccountNumber = await recyclableToken.getAccountNumber(user, accountNumber);

      const defaultAmount: Amount = {
        value: INTEGERS.ZERO,
        denomination: AmountDenomination.Principal,
        reference: AmountReference.Target,
      };

      // Only global operators can be liquidators
      await dolomiteMargin.admin.setGlobalOperator(liquidator, true, {
        from: admin,
      });

      await expectThrow(
        dolomiteMargin.operation
          .initiate()
          .liquidate({
            primaryAccountOwner: liquidator,
            primaryAccountId: INTEGERS.ZERO,
            liquidMarketId: borrowMarketId,
            payoutMarketId: marketId,
            liquidAccountOwner: recyclableToken.address,
            liquidAccountId: liquidAccountNumber,
            amount: defaultAmount,
          })
          .commit({ from: liquidator }),
        `OperationImpl: Invalid recyclable owner <${liquidator.toLowerCase()}, 0, ${marketId}>`,
      );
    });
  });

  // ============ Private Functions ============

  async function addMarket(
    underlyingToken: CustomTestToken,
    expirationTimestamp: Integer = maxExpirationTimestamp,
    isClosing: boolean = true,
  ): Promise<RecyclableTokenProxy> {
    const marginPremium = INTEGERS.ZERO;
    const spreadPremium = INTEGERS.ZERO;
    const maxWei = INTEGERS.ZERO;
    const isRecyclable = true;

    const recyclableTokenContract = (await deployContract(dolomiteMargin, RecyclableTokenProxyJSON, [
      dolomiteMargin.address,
      underlyingToken.options.address,
      dolomiteMargin.contracts.expiry.options.address,
      expirationTimestamp.toFixed(),
    ])) as TestRecyclableToken;

    await dolomiteMargin.testing.priceOracle.setPrice(recyclableTokenContract.options.address, defaultPrice);

    await dolomiteMargin.admin.addMarket(
      recyclableTokenContract.options.address,
      oracleAddress,
      setterAddress,
      marginPremium,
      spreadPremium,
      maxWei,
      isClosing,
      isRecyclable,
      { from: admin },
    );

    return new RecyclableTokenProxy(dolomiteMargin.contracts, recyclableTokenContract.options.address);
  }

  async function removeMarket(marketId: Integer, recycler: address): Promise<TxResult> {
    await expireMarket();
    return dolomiteMargin.admin.removeMarkets([marketId], recycler, { from: admin });
  }

  async function expireMarket(): Promise<void> {
    // 86400 * 7 is the buffer time; add 1 second as an additional buffer
    const timeDelta = maxExpirationTimestamp.minus(currentTimestamp).plus((86400 * 7) + 1);
    await new EVM(dolomiteMargin.web3.currentProvider).callJsonrpcMethod(
      'evm_increaseTime',
      [timeDelta.toNumber()],
    );
  }

  async function getBorrowBalance(user: address, accountNumber: Integer, marketId: Integer): Promise<Integer> {
    const userAccountNumber = await recyclableToken.getAccountNumber(user, accountNumber);
    return dolomiteMargin.getters.getAccountPar(recyclableToken.address, userAccountNumber, marketId);
  }
});
