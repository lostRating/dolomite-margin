import BigNumber from 'bignumber.js';
import { address, Integer, INTEGERS } from '../../src';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import { resetEVM, snapshot } from '../helpers/EVM';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';
import { setupMarkets } from '../helpers/DolomiteMarginHelpers';

let dolomiteMargin: TestDolomiteMargin;
let snapshotId: string;
let owner1: address;

const accountIndex0 = INTEGERS.ZERO;
const accountIndexBorrow = new BigNumber(1337);
const market1 = INTEGERS.ZERO;
const market2 = INTEGERS.ONE;
const par1 = new BigNumber(500);
const par2 = new BigNumber(100);

describe('BorrowPositionProxy', () => {
  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    owner1 = dolomiteMargin.getDefaultAccount();
    await resetEVM();
    await setupMarkets(dolomiteMargin, r.accounts);
    const [token1, token2] = [
      await dolomiteMargin.getters.getMarketTokenAddress(market1),
      await dolomiteMargin.getters.getMarketTokenAddress(market2),
    ];
    await Promise.all([
      dolomiteMargin.testing.priceOracle.setPrice(token1, new BigNumber('1e40')),
      dolomiteMargin.testing.priceOracle.setPrice(token2, new BigNumber('1e40')),
    ]);
    await dolomiteMargin.testing.setAccountBalance(owner1, accountIndex0, market1, par1);
    await dolomiteMargin.testing.setAccountBalance(owner1, accountIndex0, market2, par2);
    snapshotId = await snapshot();
  });

  beforeEach(async () => {
    await resetEVM(snapshotId);
  });

  describe('#openBorrowPosition', () => {
    it('success case', async () => {
      await expectBalances(owner1, accountIndex0, market1, par1);
      await expectBalances(owner1, accountIndexBorrow, market1, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxy.openBorrowPosition(
        accountIndex0,
        accountIndexBorrow,
        market1,
        par1,
        { from: owner1 },
      );

      await expectBalances(owner1, accountIndex0, market1, INTEGERS.ZERO);
      await expectBalances(owner1, accountIndexBorrow, market1, par1);
    });
  });

  describe('#transferBetweenAccounts', () => {
    it('success case to borrow and repay some of the debt', async () => {
      await expectBalances(owner1, accountIndex0, market1, par1);
      await expectBalances(owner1, accountIndexBorrow, market1, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxy.openBorrowPosition(
        accountIndex0,
        accountIndexBorrow,
        market1,
        par1,
        { from: owner1 },
      );

      await expectBalances(owner1, accountIndex0, market1, INTEGERS.ZERO);
      await expectBalances(owner1, accountIndexBorrow, market1, par1);

      await dolomiteMargin.borrowPositionProxy.transferBetweenAccounts(
        accountIndexBorrow,
        accountIndex0,
        market2,
        par2,
        { from: owner1 },
      );

      await expectBalances(owner1, accountIndex0, market1, INTEGERS.ZERO);
      await expectBalances(owner1, accountIndex0, market2, par2.times(2));
      await expectBalances(owner1, accountIndexBorrow, market1, par1);
      await expectBalances(owner1, accountIndexBorrow, market2, par2.times(-1));

      await dolomiteMargin.borrowPositionProxy.transferBetweenAccounts(
        accountIndex0,
        accountIndexBorrow,
        market2,
        par2.div(2),
        { from: owner1 },
      );

      await expectBalances(owner1, accountIndex0, market1, INTEGERS.ZERO);
      await expectBalances(owner1, accountIndex0, market2, par2.times(1.5));
      await expectBalances(owner1, accountIndexBorrow, market1, par1);
      await expectBalances(owner1, accountIndexBorrow, market2, par2.times(-0.5));
    });
  });

  describe('#repayAllForBorrowPosition', () => {
    it('success case to borrow and repay debt', async () => {
      await expectBalances(owner1, accountIndex0, market1, par1);
      await expectBalances(owner1, accountIndexBorrow, market1, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxy.openBorrowPosition(
        accountIndex0,
        accountIndexBorrow,
        market1,
        par1,
        { from: owner1 },
      );

      await expectBalances(owner1, accountIndex0, market1, INTEGERS.ZERO);
      await expectBalances(owner1, accountIndexBorrow, market1, par1);

      await dolomiteMargin.borrowPositionProxy.transferBetweenAccounts(
        accountIndexBorrow,
        accountIndex0,
        market2,
        par2,
        { from: owner1 },
      );

      await expectBalances(owner1, accountIndex0, market1, INTEGERS.ZERO);
      await expectBalances(owner1, accountIndex0, market2, par2.times(2));
      await expectBalances(owner1, accountIndexBorrow, market1, par1);
      await expectBalances(owner1, accountIndexBorrow, market2, par2.times(-1));

      await dolomiteMargin.borrowPositionProxy.repayAllForBorrowPosition(
        accountIndex0,
        accountIndexBorrow,
        market2,
      );

      await expectBalances(owner1, accountIndex0, market1, INTEGERS.ZERO);
      await expectBalances(owner1, accountIndex0, market2, par2);
      await expectBalances(owner1, accountIndexBorrow, market1, par1);
      await expectBalances(owner1, accountIndexBorrow, market2, INTEGERS.ZERO);
    });
  });

  describe('#closeBorrowPosition', () => {
    it('success case when debt is repaid', async () => {
      await expectBalances(owner1, accountIndex0, market1, par1);
      await expectBalances(owner1, accountIndexBorrow, market1, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxy.openBorrowPosition(
        accountIndex0,
        accountIndexBorrow,
        market1,
        par1,
        { from: owner1 },
      );

      await expectBalances(owner1, accountIndex0, market1, INTEGERS.ZERO);
      await expectBalances(owner1, accountIndexBorrow, market1, par1);

      await dolomiteMargin.borrowPositionProxy.transferBetweenAccounts(
        accountIndexBorrow,
        accountIndex0,
        market2,
        par2,
        { from: owner1 },
      );

      await expectBalances(owner1, accountIndex0, market1, INTEGERS.ZERO);
      await expectBalances(owner1, accountIndex0, market2, par2.times(2));
      await expectBalances(owner1, accountIndexBorrow, market1, par1);
      await expectBalances(owner1, accountIndexBorrow, market2, par2.times(-1));

      await dolomiteMargin.borrowPositionProxy.repayAllForBorrowPosition(
        accountIndex0,
        accountIndexBorrow,
        market2,
      );

      await expectBalances(owner1, accountIndex0, market1, INTEGERS.ZERO);
      await expectBalances(owner1, accountIndex0, market2, par2);
      await expectBalances(owner1, accountIndexBorrow, market1, par1);
      await expectBalances(owner1, accountIndexBorrow, market2, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxy.closeBorrowPosition(
        accountIndexBorrow,
        accountIndex0,
        [market1],
      );

      await expectBalances(owner1, accountIndex0, market1, par1);
      await expectBalances(owner1, accountIndex0, market2, par2);
      await expectBalances(owner1, accountIndexBorrow, market1, INTEGERS.ZERO);
      await expectBalances(owner1, accountIndexBorrow, market2, INTEGERS.ZERO);
    });
  });
});

// =============== Helper Functions

async function expectBalances(
  owner: address,
  accountIndex: Integer,
  market: Integer,
  amount: Integer,
): Promise<void> {
  const balance = await dolomiteMargin.getters.getAccountWei(owner, accountIndex, market);
  expect(balance).to.eql(amount);
}
