import BigNumber from 'bignumber.js';

import CustomTestTokenJSON from '../../build/contracts/CustomTestToken.json';
import RecyclableTokenProxyJSON from '../../build/contracts/RecyclableTokenProxy.json';
import TestTraderJSON from '../../build/contracts/TestTrader.json';

import { CustomTestToken } from '../../build/testing_wrappers/CustomTestToken';
import { TestRecyclableToken } from '../../build/testing_wrappers/TestRecyclableToken';
import { TestTrader } from '../../build/testing_wrappers/TestTrader';
import { address, Amount, AmountDenomination, AmountReference, Integer, INTEGERS, TxResult } from '../../src';
import { toBytes } from '../../src/lib/BytesHelper';
import { expectThrow } from '../../src/lib/Expect';
import { deployContract } from '../helpers/Deploy';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import { setupMarkets } from '../helpers/DolomiteMarginHelpers';
import { resetEVM, snapshot } from '../helpers/EVM';
import { EVM } from '../modules/EVM';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';

let dolomiteMargin: TestDolomiteMargin;
let accounts: address[];
let admin: address;
let user: address;
let liquidator: address;
let oracleAddress: address;
let setterAddress: address;
let borrowTokenAddress: address;
let customToken: CustomTestToken;
let recyclableToken: TestRecyclableToken;
let testTrader: TestTrader;
let marketId: Integer;

const borrowMarketId: Integer = INTEGERS.ZERO;
const defaultPrice = new BigNumber('1e36');

const currentTimestamp = Math.floor(new Date().getTime() / 1000);
const defaultExpirationTimestamp = currentTimestamp + 600; // add 600 seconds (10 minutes) on as a buffer
const maxExpirationTimestamp = currentTimestamp + 86400; // expires in 1 day
const defaultIsOpen = true;

describe('RecyclableTokenProxy', () => {
  let snapshotId: string;

  beforeAll(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    accounts = r.accounts;
    admin = accounts[0];
    user = accounts[2];
    liquidator = accounts[3];
    expect(admin).not.toEqual(user);

    await resetEVM();

    await Promise.all([setupMarkets(dolomiteMargin, accounts, 3)]);

    oracleAddress = dolomiteMargin.testing.priceOracle.address;
    setterAddress = dolomiteMargin.testing.interestSetter.address;

    const { recyclableToken: _recyclableToken, customToken: _customToken } = await addMarket();
    recyclableToken = _recyclableToken;
    customToken = _customToken;
    marketId = new BigNumber(
      await dolomiteMargin.contracts.callConstantContractFunction(recyclableToken.methods.MARKET_ID())
    );
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

  describe('#getAccountNumber', () => {
    it('Successfully gets the account number', async () => {
      const _number = 1;
      const account = { owner: user, number: _number };
      const accountNumber = await dolomiteMargin.contracts.callConstantContractFunction(
        recyclableToken.methods.getAccountNumber(account)
      );
      const created = dolomiteMargin.web3.utils.keccak256(
        dolomiteMargin.web3.eth.abi.encodeParameters(['address', 'uint256'], [user, _number]),
      );
      expect(accountNumber).toEqual(dolomiteMargin.web3.utils.hexToNumberString(created));
    });
  });

  describe('#depositIntoDolomiteMargin', () => {
    it('Successfully deposits into DolomiteMargin', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 0;
      const balance = 100;
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.options.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, balance), tx);
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.depositIntoDolomiteMargin(accountNumber, balance),
        tx,
      );
      expect(await getOwnerBalance(user, accountNumber, marketId)).toEqual(new BigNumber(balance));
    });

    it('Successfully deposits into DolomiteMargin with random account number', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 132;
      const balance = 100;
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.options.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, balance), tx);
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.depositIntoDolomiteMargin(accountNumber, balance),
        tx,
      );
      expect(await getOwnerBalance(user, accountNumber, marketId)).toEqual(new BigNumber(balance));
    });

    it('Fails to deposit when contract is expired', async () => {
      const accountNumber = 132;
      const balance = 100;
      await expireMarket();
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(
          recyclableToken.methods.depositIntoDolomiteMargin(accountNumber, balance),
          { from: user },
        ),
        `RecyclableTokenProxy: market is expired <${maxExpirationTimestamp}>`,
      );
    });

    it('Fails to deposit when recycled', async () => {
      const accountNumber = 132;
      const balance = 100;
      await removeMarket(marketId, recyclableToken.options.address);
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(
          recyclableToken.methods.depositIntoDolomiteMargin(accountNumber, balance),
          { from: user },
        ),
        'RecyclableTokenProxy: cannot deposit when recycled',
      );
    });

    it('Fails to deposit when approval is not set for underlying token with recyclable spender', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 132;
      const balance = 100;
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, balance), tx);
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(
          recyclableToken.methods.depositIntoDolomiteMargin(accountNumber, balance),
          tx,
        ),
        'SafeERC20: low-level call failed',
      );
    });
  });

  describe('#withdrawFromDolomiteMargin', () => {
    it('Successfully withdraws from DolomiteMargin', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 0;
      const balance = 100;
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.options.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, balance), tx);
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.depositIntoDolomiteMargin(accountNumber, balance),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.withdrawFromDolomiteMargin(accountNumber, balance - 10),
        tx,
      );
      expect(await getOwnerBalance(user, accountNumber, marketId)).toEqual(new BigNumber(10));
      expect(await dolomiteMargin.contracts.callConstantContractFunction(
        customToken.methods.balanceOf(user)
      )).toEqual((balance - 10).toString());
    });

    it('Fails to withdraw when in recycled state', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 132;
      const balance = 100;
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.options.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, balance), tx);
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.depositIntoDolomiteMargin(accountNumber, balance),
        tx,
      );
      await removeMarket(marketId, recyclableToken.options.address);
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(
          recyclableToken.methods.withdrawFromDolomiteMargin(accountNumber, balance),
          tx,
        ),
        'RecyclableTokenProxy: cannot withdraw when recycled',
      );
    });
  });

  describe('#withdrawAfterRecycle', () => {
    it('Successfully withdraws when in recycled state', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 0;
      const balance = 100;
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.options.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, balance), tx);
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.depositIntoDolomiteMargin(accountNumber, balance),
        tx,
      );
      await removeMarket(marketId, recyclableToken.options.address);
      expect(await dolomiteMargin.contracts.callConstantContractFunction(
        customToken.methods.balanceOf(user)
      )).toEqual('0');
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.withdrawAfterRecycle(accountNumber),
        tx,
      );
      expect(await dolomiteMargin.contracts.callConstantContractFunction(
        customToken.methods.balanceOf(user)
      )).toEqual(balance.toString());
    });

    it('Fails to withdraw twice to the same address in a recycled state', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 0;
      const balance = 100;
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.options.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, balance), tx);
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.depositIntoDolomiteMargin(accountNumber, balance),
        tx,
      );
      await removeMarket(marketId, recyclableToken.options.address);
      expect(await dolomiteMargin.contracts.callConstantContractFunction(
        customToken.methods.balanceOf(user)
      )).toEqual('0');
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.withdrawAfterRecycle(accountNumber),
        tx,
      );
      expect(await dolomiteMargin.contracts.callConstantContractFunction(
        customToken.methods.balanceOf(user)
      )).toEqual(balance.toString());
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(recyclableToken.methods.withdrawAfterRecycle(accountNumber), tx),
        'RecyclableTokenProxy: user already withdrew',
      );
    });

    it('Fails to withdraw when not in recycled state', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 0;
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(recyclableToken.methods.withdrawAfterRecycle(accountNumber), tx),
        'RecyclableTokenProxy: not recycled yet',
      );
    });
  });

  describe('#trade', () => {
    it('Successfully trades with test wrapper', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 0;
      const supplyBalancePar = 100;
      const borrowBalanceWei = 20;
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.options.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, supplyBalancePar), tx);
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.depositIntoDolomiteMargin(accountNumber, supplyBalancePar),
        tx,
      );
      expect(await getOwnerBalance(user, accountNumber, marketId)).toEqual(new BigNumber(supplyBalancePar));
      expect(await getOwnerBalance(user, accountNumber, borrowMarketId)).toEqual(INTEGERS.ZERO);

      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.trade(
          accountNumber,
          { sign: true, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
          borrowTokenAddress,
          { sign: false, denomination: AmountDenomination.Wei, ref: AmountReference.Delta, value: borrowBalanceWei },
          testTrader.options.address,
          defaultExpirationTimestamp,
          defaultIsOpen,
          toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
        ),
        tx,
      );

      expect(await getOwnerBalance(user, accountNumber, marketId)).toEqual(
        new BigNumber(supplyBalancePar + supplyBalancePar),
      );
      expect(await getOwnerBalance(user, accountNumber, borrowMarketId)).toEqual(new BigNumber(-borrowBalanceWei));
      const recyclableAccount = await dolomiteMargin.contracts.callConstantContractFunction(
        recyclableToken.methods.getAccountNumber({ owner: user, number: accountNumber }),
      );
      expect(
        await dolomiteMargin.expiry.getExpiry(
          recyclableToken.options.address,
          new BigNumber(recyclableAccount),
          borrowMarketId,
        ),
      ).toEqual(new BigNumber(defaultExpirationTimestamp));
    });

    it('Successfully closes a position via a trade with test wrapper', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 0;
      const supplyBalancePar = 100;
      const borrowBalanceWei = 20;
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.options.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, supplyBalancePar), tx);
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.depositIntoDolomiteMargin(accountNumber, supplyBalancePar),
        tx,
      );
      expect(await getOwnerBalance(user, accountNumber, marketId)).toEqual(new BigNumber(supplyBalancePar));
      expect(await getOwnerBalance(user, accountNumber, borrowMarketId)).toEqual(INTEGERS.ZERO);

      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.trade(
          accountNumber,
          { sign: true, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
          borrowTokenAddress,
          { sign: false, denomination: AmountDenomination.Wei, ref: AmountReference.Delta, value: borrowBalanceWei },
          testTrader.options.address,
          defaultExpirationTimestamp,
          defaultIsOpen,
          toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
        ),
        tx,
      );

      expect(await getOwnerBalance(user, accountNumber, marketId)).toEqual(
        new BigNumber(supplyBalancePar + supplyBalancePar),
      );
      expect(await getOwnerBalance(user, accountNumber, borrowMarketId)).toEqual(new BigNumber(-borrowBalanceWei));
      const recyclableAccount = await dolomiteMargin.contracts.callConstantContractFunction(
        recyclableToken.methods.getAccountNumber({ owner: user, number: accountNumber }),
      );
      expect(
        await dolomiteMargin.expiry.getExpiry(
          recyclableToken.options.address,
          new BigNumber(recyclableAccount),
          borrowMarketId,
        ),
      ).toEqual(new BigNumber(defaultExpirationTimestamp));

      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.trade(
          accountNumber,
          { sign: false, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
          borrowTokenAddress,
          { sign: false, denomination: AmountDenomination.Wei, ref: AmountReference.Target, value: '0' },
          testTrader.options.address,
          defaultExpirationTimestamp,
          !defaultIsOpen,
          toBytes(borrowBalanceWei, supplyBalancePar, !defaultIsOpen),
        ),
        tx,
      );
    });

    it('Fails to trade when recyclable contract is expired', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 132;
      const supplyBalancePar = 100;
      const borrowBalanceWei = supplyBalancePar / 10;
      await expireMarket();
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(
          recyclableToken.methods.trade(
            accountNumber,
            { sign: true, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
            borrowTokenAddress,
            { sign: false, denomination: AmountDenomination.Wei, ref: AmountReference.Delta, value: borrowBalanceWei },
            testTrader.options.address,
            defaultExpirationTimestamp,
            defaultIsOpen,
            toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
          ),
          tx,
        ),
        `RecyclableTokenProxy: market is expired <${maxExpirationTimestamp}>`,
      );
    });

    it('Fails to trade when recyclable contract expiration timestamp is too low', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 132;
      const supplyBalancePar = 100;
      const borrowBalanceWei = supplyBalancePar / 10;
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(
          recyclableToken.methods.trade(
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
            currentTimestamp - 1,
            defaultIsOpen,
            toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
          ),
          tx,
        ),
        `RecyclableTokenProxy: expiration timestamp too low <${currentTimestamp - 1}>`,
      );
    });

    it('Fails to trade when recyclable contract expiration timestamp is too high', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 132;
      const supplyBalancePar = 100;
      const borrowBalanceWei = supplyBalancePar / 10;
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(
          recyclableToken.methods.trade(
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
            maxExpirationTimestamp + 1,
            defaultIsOpen,
            toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
          ),
          tx,
        ),
        `RecyclableTokenProxy: expiration timestamp too high <${maxExpirationTimestamp + 1}>`,
      );
    });

    it('Fails to trade when in recycled state', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 132;
      const supplyBalancePar = 100;
      await removeMarket(marketId, recyclableToken.options.address);
      const borrowBalanceWei = supplyBalancePar / 10;
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(
          recyclableToken.methods.trade(
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
            defaultExpirationTimestamp,
            defaultIsOpen,
            toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
          ),
          tx,
        ),
        'RecyclableTokenProxy: cannot trade when recycled',
      );
    });

    it('Fails to trade when position would be under collateralized', async () => {
      const tx = {
        from: user,
      };
      const outerAccountNumber = 132;
      const innerAccountNumber = await dolomiteMargin.contracts.callConstantContractFunction(
        recyclableToken.methods.getAccountNumber({ owner: user, number: outerAccountNumber }),
      );
      const supplyBalancePar = 100;
      const borrowBalanceWei = 100;
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.options.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, supplyBalancePar), tx);
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.depositIntoDolomiteMargin(outerAccountNumber, supplyBalancePar),
        tx,
      );
      await expectThrow(
        dolomiteMargin.contracts.callContractFunction(
          recyclableToken.methods.trade(
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
            defaultExpirationTimestamp,
            defaultIsOpen,
            toBytes(supplyBalancePar / 10, borrowBalanceWei, defaultIsOpen),
          ),
          tx,
        ),
        `OperationImpl: Undercollateralized account <${recyclableToken.options.address.toLowerCase()}, ${innerAccountNumber}>`,
      );
    });
  });

  describe('#liquidate', () => {
    it('Successfully liquidates when a user is undercollateralized and liquidator withdraws', async () => {
      const tx = {
        from: user,
      };
      const accountNumber = 0;
      const supplyBalancePar = 100;
      const borrowBalanceWei = 100;
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.options.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, supplyBalancePar), tx);
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.depositIntoDolomiteMargin(accountNumber, supplyBalancePar),
        tx,
      );
      expect(await getOwnerBalance(user, accountNumber, marketId)).toEqual(new BigNumber(supplyBalancePar));
      expect(await getOwnerBalance(user, accountNumber, borrowMarketId)).toEqual(INTEGERS.ZERO);

      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.trade(
          accountNumber,
          { sign: true, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
          borrowTokenAddress,
          { sign: false, denomination: AmountDenomination.Wei, ref: AmountReference.Delta, value: borrowBalanceWei },
          testTrader.options.address,
          defaultExpirationTimestamp,
          defaultIsOpen,
          toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
        ),
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

      const liquidAccountId = await dolomiteMargin.contracts.callConstantContractFunction(
        recyclableToken.methods.getAccountNumber({ owner: user, number: accountNumber }),
      );

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
          liquidAccountOwner: recyclableToken.options.address,
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
      const accountNumber = 0;
      const supplyBalancePar = 100;
      const borrowBalanceWei = 100;
      await dolomiteMargin.contracts.callContractFunction(
        customToken.methods.approve(recyclableToken.options.address, INTEGERS.MAX_UINT.toFixed()),
        tx,
      );
      await dolomiteMargin.contracts.callContractFunction(customToken.methods.setBalance(user, supplyBalancePar), tx);
      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.depositIntoDolomiteMargin(accountNumber, supplyBalancePar),
        tx,
      );
      expect(await getOwnerBalance(user, accountNumber, marketId)).toEqual(new BigNumber(supplyBalancePar));
      expect(await getOwnerBalance(user, accountNumber, borrowMarketId)).toEqual(INTEGERS.ZERO);

      await dolomiteMargin.contracts.callContractFunction(
        recyclableToken.methods.trade(
          accountNumber,
          { sign: true, denomination: AmountDenomination.Par, ref: AmountReference.Delta, value: supplyBalancePar },
          borrowTokenAddress,
          { sign: false, denomination: AmountDenomination.Wei, ref: AmountReference.Delta, value: borrowBalanceWei },
          testTrader.options.address,
          defaultExpirationTimestamp,
          defaultIsOpen,
          toBytes(supplyBalancePar, borrowBalanceWei, defaultIsOpen),
        ),
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

      const liquidAccountId = await dolomiteMargin.contracts.callConstantContractFunction(
        recyclableToken.methods.getAccountNumber({ owner: user, number: accountNumber }),
      );

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
            liquidAccountOwner: recyclableToken.options.address,
            liquidAccountId: new BigNumber(liquidAccountId),
            amount: defaultAmount,
          })
          .commit({ from: liquidator }),
        `OperationImpl: Invalid recyclable owner <${liquidator.toLowerCase()}, 0, ${marketId}>`,
      );
    });
  });

  // ============ Private Functions ============

  async function addMarket(): Promise<{
    recyclableToken: TestRecyclableToken;
    customToken: CustomTestToken;
  }> {
    const marginPremium = INTEGERS.ZERO;
    const spreadPremium = INTEGERS.ZERO;
    const maxWei = INTEGERS.ZERO;
    const isClosing = true;
    const isRecyclable = true;

    const underlyingToken = (await deployContract(dolomiteMargin, CustomTestTokenJSON, [
      'TestToken',
      'TST',
      '18',
    ])) as CustomTestToken;

    const recyclableToken = (await deployContract(dolomiteMargin, RecyclableTokenProxyJSON, [
      dolomiteMargin.address,
      underlyingToken.options.address,
      dolomiteMargin.contracts.expiry.options.address,
      maxExpirationTimestamp,
    ])) as TestRecyclableToken;

    await dolomiteMargin.testing.priceOracle.setPrice(recyclableToken.options.address, defaultPrice);

    await dolomiteMargin.admin.addMarket(
      recyclableToken.options.address,
      oracleAddress,
      setterAddress,
      marginPremium,
      spreadPremium,
      maxWei,
      isClosing,
      isRecyclable,
      { from: admin },
    );

    return { recyclableToken, customToken: underlyingToken };
  }

  async function removeMarket(marketId: Integer, recycler: address): Promise<TxResult> {
    await expireMarket();
    return dolomiteMargin.admin.removeMarkets([marketId], recycler, { from: admin });
  }

  async function getOwnerBalance(owner: address, accountNumber: number, market: Integer): Promise<Integer> {
    const recyclableAccount = await dolomiteMargin.contracts.callConstantContractFunction(
      recyclableToken.methods.getAccountNumber({ owner, number: accountNumber }),
    );
    return await dolomiteMargin.getters.getAccountPar(
      recyclableToken.options.address,
      new BigNumber(recyclableAccount),
      market,
    );
  }

  async function expireMarket(): Promise<void> {
    await new EVM(dolomiteMargin.web3.currentProvider).callJsonrpcMethod(
      'evm_increaseTime',
      [maxExpirationTimestamp - currentTimestamp + 1 + 86400 * 7], // 86400 * 7 is the buffer time; add 1 second as an additional buffer
    );
  }
});
