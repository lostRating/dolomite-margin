import BigNumber from 'bignumber.js';
import { address, BalanceCheckFlag, Integer, INTEGERS } from '../../src';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import { resetEVM, snapshot } from '../helpers/EVM';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';
import { setupMarkets } from '../helpers/DolomiteMarginHelpers';
import { expectThrowInvalidBalance, expectThrowUnauthorizedBase } from '../helpers/Expect';

let dolomiteMargin: TestDolomiteMargin;
let snapshotId: string;
let admin: address;
let fromAccountOwner: address;
let borrowAccountOwner: address;
let caller: address;

const fromAccountNumber = INTEGERS.ZERO;
const borrowAccountNumber = new BigNumber(1337);
const market1 = INTEGERS.ZERO;
const market2 = INTEGERS.ONE;
const wei1 = new BigNumber(500);
const weiBig1 = new BigNumber(550);
const wei2 = new BigNumber(100);
const negativeBalanceWei1 = wei1.minus(weiBig1);
const defaultBalanceCheckFlag = BalanceCheckFlag.None;

describe('BorrowPositionProxyV2', () => {
  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    admin = r.accounts[0];
    fromAccountOwner = dolomiteMargin.getDefaultAccount();
    borrowAccountOwner = r.accounts[4];
    caller = r.accounts[5];
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
    await dolomiteMargin.testing.setAccountBalance(fromAccountOwner, fromAccountNumber, market1, wei1);
    await dolomiteMargin.testing.setAccountBalance(fromAccountOwner, fromAccountNumber, market2, wei2);
    await dolomiteMargin.borrowPositionProxyV2.setIsCallerAuthorized(caller, true, { from: admin });
    snapshotId = await snapshot();
  });

  beforeEach(async () => {
    await resetEVM(snapshotId);
  });

  describe('#openBorrowPositionWithDifferentAccounts', () => {
    it('should work normally', async () => {
      await expectBalances(fromAccountOwner, fromAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxyV2.openBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber,
        borrowAccountOwner,
        borrowAccountNumber,
        market1,
        wei1,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, INTEGERS.ZERO);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);
    });

    it('should work when balanceCheckFlag is set to None and user goes negative', async () => {
      await expectBalances(fromAccountOwner, fromAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxyV2.openBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber,
        borrowAccountOwner,
        borrowAccountNumber,
        market1,
        weiBig1,
        BalanceCheckFlag.None,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, negativeBalanceWei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, weiBig1);
    });

    it('should not work user goes negative and flag is set to Both or From', async () => {
      await expectBalances(fromAccountOwner, fromAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, INTEGERS.ZERO);

      await expectThrowInvalidBalance(
        dolomiteMargin.borrowPositionProxyV2.openBorrowPositionWithDifferentAccounts(
          fromAccountOwner,
          fromAccountNumber,
          borrowAccountOwner,
          borrowAccountNumber,
          market1,
          weiBig1,
          BalanceCheckFlag.From,
          { from: caller },
        ),
        fromAccountOwner,
        fromAccountNumber,
        market1,
      );
      await expectThrowInvalidBalance(
        dolomiteMargin.borrowPositionProxyV2.openBorrowPositionWithDifferentAccounts(
          fromAccountOwner,
          fromAccountNumber,
          borrowAccountOwner,
          borrowAccountNumber,
          market1,
          weiBig1,
          BalanceCheckFlag.Both,
          { from: caller },
        ),
        fromAccountOwner,
        fromAccountNumber,
        market1,
      );
    });

    it('should not work caller is not authorized', async () => {
      await dolomiteMargin.borrowPositionProxyV2.setIsCallerAuthorized(caller, false, { from: admin });
      expect(await dolomiteMargin.borrowPositionProxyV2.isCallerAuthorized(caller)).to.eql(false);

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, INTEGERS.ZERO);

      await expectThrowUnauthorizedBase(
        dolomiteMargin.borrowPositionProxyV2.openBorrowPositionWithDifferentAccounts(
          fromAccountOwner,
          fromAccountNumber,
          borrowAccountOwner,
          borrowAccountNumber,
          market1,
          weiBig1,
          BalanceCheckFlag.From,
          { from: caller },
        ),
        caller,
      );
    });
  });

  describe('#transferBetweenAccountsWithDifferentAccounts', () => {
    it('success case to borrow and repay some of the debt', async () => {
      await expectBalances(fromAccountOwner, fromAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxyV2.openBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber,
        borrowAccountOwner,
        borrowAccountNumber,
        market1,
        wei1,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, INTEGERS.ZERO);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);

      await dolomiteMargin.borrowPositionProxyV2.transferBetweenAccountsWithDifferentAccounts(
        borrowAccountOwner,
        borrowAccountNumber,
        fromAccountOwner,
        fromAccountNumber,
        market2,
        wei2,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, INTEGERS.ZERO);
      await expectBalances(fromAccountOwner, fromAccountNumber, market2, wei2.times(2));
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market2, wei2.times(-1));

      await dolomiteMargin.borrowPositionProxyV2.transferBetweenAccountsWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber,
        borrowAccountOwner,
        borrowAccountNumber,
        market2,
        wei2.div(2),
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, INTEGERS.ZERO);
      await expectBalances(fromAccountOwner, fromAccountNumber, market2, wei2.times(1.5));
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market2, wei2.times(-0.5));
    });

    it('should fail when BalanceCheckFlag is set to To or Both and borrow account has debt still', async () => {
      await expectBalances(fromAccountOwner, fromAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxyV2.openBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber,
        borrowAccountOwner,
        borrowAccountNumber,
        market1,
        weiBig1,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, negativeBalanceWei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, weiBig1);

      await dolomiteMargin.borrowPositionProxyV2.transferBetweenAccountsWithDifferentAccounts(
        borrowAccountOwner,
        borrowAccountNumber,
        fromAccountOwner,
        fromAccountNumber,
        market2,
        wei2,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, negativeBalanceWei1);
      await expectBalances(fromAccountOwner, fromAccountNumber, market2, wei2.times(2));
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, weiBig1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market2, wei2.times(-1));

      await expectThrowInvalidBalance(
        dolomiteMargin.borrowPositionProxyV2.transferBetweenAccountsWithDifferentAccounts(
          fromAccountOwner,
          fromAccountNumber,
          borrowAccountOwner,
          borrowAccountNumber,
          market2,
          wei2.div(2),
          BalanceCheckFlag.To,
          { from: caller },
        ),
        borrowAccountOwner,
        borrowAccountNumber,
        market2,
      );
      // fromAccount takes priority and is checked first, BUT market2 is all good for fromAccount
      await expectThrowInvalidBalance(
        dolomiteMargin.borrowPositionProxyV2.transferBetweenAccountsWithDifferentAccounts(
          fromAccountOwner,
          fromAccountNumber,
          borrowAccountOwner,
          borrowAccountNumber,
          market2,
          wei2.div(2),
          BalanceCheckFlag.Both,
          { from: caller },
        ),
        borrowAccountOwner,
        borrowAccountNumber,
        market2,
      );
      await expectThrowInvalidBalance(
        dolomiteMargin.borrowPositionProxyV2.transferBetweenAccountsWithDifferentAccounts(
          fromAccountOwner,
          fromAccountNumber,
          borrowAccountOwner,
          borrowAccountNumber,
          market1,
          new BigNumber(1),
          BalanceCheckFlag.Both,
          { from: caller },
        ),
        fromAccountOwner,
        fromAccountNumber,
        market1,
      );
    });

    it('should not work caller is not authorized', async () => {
      await expectBalances(fromAccountOwner, fromAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxyV2.openBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber,
        borrowAccountOwner,
        borrowAccountNumber,
        market1,
        weiBig1,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, negativeBalanceWei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, weiBig1);

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, negativeBalanceWei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, weiBig1);

      await dolomiteMargin.borrowPositionProxyV2.setIsCallerAuthorized(caller, false, { from: admin });
      expect(await dolomiteMargin.borrowPositionProxyV2.isCallerAuthorized(caller)).to.eql(false);

      await expectThrowUnauthorizedBase(
        dolomiteMargin.borrowPositionProxyV2.transferBetweenAccountsWithDifferentAccounts(
          borrowAccountOwner,
          borrowAccountNumber,
          fromAccountOwner,
          fromAccountNumber,
          market2,
          wei2,
          defaultBalanceCheckFlag,
          { from: caller },
        ),
        caller,
      );
    });
  });

  describe('#repayAllForBorrowPositionWithDifferentAccounts', () => {
    it('success case to borrow and repay debt', async () => {
      await expectBalances(fromAccountOwner, fromAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxyV2.openBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber,
        borrowAccountOwner,
        borrowAccountNumber,
        market1,
        wei1,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, INTEGERS.ZERO);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);

      await dolomiteMargin.borrowPositionProxyV2.transferBetweenAccountsWithDifferentAccounts(
        borrowAccountOwner,
        borrowAccountNumber,
        fromAccountOwner,
        fromAccountNumber,
        market2,
        wei2,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, INTEGERS.ZERO);
      await expectBalances(fromAccountOwner, fromAccountNumber, market2, wei2.times(2));
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market2, wei2.times(-1));

      await dolomiteMargin.borrowPositionProxyV2.repayAllForBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber,
        borrowAccountOwner,
        borrowAccountNumber,
        market2,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, INTEGERS.ZERO);
      await expectBalances(fromAccountOwner, fromAccountNumber, market2, wei2);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market2, INTEGERS.ZERO);
    });

    it('should work when BalanceCheckFlag is set to None and from account has debt after repaying', async () => {
      await dolomiteMargin.testing.setAccountBalance(fromAccountOwner, fromAccountNumber, market1, weiBig1);
      await dolomiteMargin.testing.setAccountBalance(fromAccountOwner, fromAccountNumber, market2, INTEGERS.ZERO);
      await dolomiteMargin.testing.setAccountBalance(borrowAccountOwner, borrowAccountNumber, market1, wei1);
      await dolomiteMargin.testing.setAccountBalance(borrowAccountOwner, borrowAccountNumber, market2, wei2.negated());

      await dolomiteMargin.borrowPositionProxyV2.repayAllForBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber,
        borrowAccountOwner,
        borrowAccountNumber,
        market2,
        BalanceCheckFlag.None,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, weiBig1);
      await expectBalances(fromAccountOwner, fromAccountNumber, market2, wei2.negated());
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market2, INTEGERS.ZERO);
    });

    it('should work when BalanceCheckFlag is set to To and from account has debt after repaying', async () => {
      await dolomiteMargin.testing.setAccountBalance(fromAccountOwner, fromAccountNumber, market1, weiBig1);
      await dolomiteMargin.testing.setAccountBalance(fromAccountOwner, fromAccountNumber, market2, INTEGERS.ZERO);
      await dolomiteMargin.testing.setAccountBalance(borrowAccountOwner, borrowAccountNumber, market1, wei1);
      await dolomiteMargin.testing.setAccountBalance(borrowAccountOwner, borrowAccountNumber, market2, wei2.negated());

      await dolomiteMargin.borrowPositionProxyV2.repayAllForBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber,
        borrowAccountOwner,
        borrowAccountNumber,
        market2,
        BalanceCheckFlag.To,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, weiBig1);
      await expectBalances(fromAccountOwner, fromAccountNumber, market2, wei2.negated());
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market2, INTEGERS.ZERO);
    });

    it('should fail when BalanceCheckFlag is set to From or Both and from account has debt after repaying', async () => {
      await dolomiteMargin.testing.setAccountBalance(fromAccountOwner, fromAccountNumber, market1, weiBig1);
      await dolomiteMargin.testing.setAccountBalance(fromAccountOwner, fromAccountNumber, market2, INTEGERS.ZERO);
      await dolomiteMargin.testing.setAccountBalance(borrowAccountOwner, borrowAccountNumber, market1, wei1);
      await dolomiteMargin.testing.setAccountBalance(borrowAccountOwner, borrowAccountNumber, market2, wei2.negated());

      await expectThrowInvalidBalance(
        dolomiteMargin.borrowPositionProxyV2.repayAllForBorrowPositionWithDifferentAccounts(
          fromAccountOwner,
          fromAccountNumber,
          borrowAccountOwner,
          borrowAccountNumber,
          market2,
          BalanceCheckFlag.From,
          { from: caller },
        ),
        fromAccountOwner,
        fromAccountNumber,
        market2
      );
      await expectThrowInvalidBalance(
        dolomiteMargin.borrowPositionProxyV2.repayAllForBorrowPositionWithDifferentAccounts(
          fromAccountOwner,
          fromAccountNumber,
          borrowAccountOwner,
          borrowAccountNumber,
          market2,
          BalanceCheckFlag.Both,
          { from: caller },
        ),
        fromAccountOwner,
        fromAccountNumber,
        market2
      );
    });

    it('should fail when unauthorized', async () => {
      await expectBalances(fromAccountOwner, fromAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxyV2.openBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber,
        borrowAccountOwner,
        borrowAccountNumber,
        market1,
        wei1,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, INTEGERS.ZERO);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);

      await dolomiteMargin.borrowPositionProxyV2.transferBetweenAccountsWithDifferentAccounts(
        borrowAccountOwner,
        borrowAccountNumber,
        fromAccountOwner,
        fromAccountNumber,
        market2,
        wei2,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, INTEGERS.ZERO);
      await expectBalances(fromAccountOwner, fromAccountNumber, market2, wei2.times(2));
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market2, wei2.times(-1));

      await dolomiteMargin.borrowPositionProxyV2.setIsCallerAuthorized(caller, false, { from: admin });
      expect(await dolomiteMargin.borrowPositionProxyV2.isCallerAuthorized(caller)).to.eql(false);

      await expectThrowUnauthorizedBase(
        dolomiteMargin.borrowPositionProxyV2.repayAllForBorrowPositionWithDifferentAccounts(
          fromAccountOwner,
          fromAccountNumber,
          borrowAccountOwner,
          borrowAccountNumber,
          market2,
          defaultBalanceCheckFlag,
          { from: caller },
        ),
        caller,
      );
    });
  });

  describe('#closeBorrowPositionWithDifferentAccounts', () => {
    it('success case when debt is repaid', async () => {
      await expectBalances(fromAccountOwner, fromAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxyV2.openBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber,
        borrowAccountOwner,
        borrowAccountNumber,
        market1,
        wei1,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, INTEGERS.ZERO);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);

      await dolomiteMargin.borrowPositionProxyV2.transferBetweenAccountsWithDifferentAccounts(
        borrowAccountOwner,
        borrowAccountNumber,
        fromAccountOwner,
        fromAccountNumber,
        market2,
        wei2,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, INTEGERS.ZERO);
      await expectBalances(fromAccountOwner, fromAccountNumber, market2, wei2.times(2));
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market2, wei2.times(-1));

      await dolomiteMargin.borrowPositionProxyV2.repayAllForBorrowPositionWithDifferentAccounts(
        fromAccountOwner,
        fromAccountNumber,
        borrowAccountOwner,
        borrowAccountNumber,
        market2,
        defaultBalanceCheckFlag,
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, INTEGERS.ZERO);
      await expectBalances(fromAccountOwner, fromAccountNumber, market2, wei2);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, wei1);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market2, INTEGERS.ZERO);

      await dolomiteMargin.borrowPositionProxyV2.closeBorrowPositionWithDifferentAccounts(
        borrowAccountOwner,
        borrowAccountNumber,
        fromAccountOwner,
        fromAccountNumber,
        [market1],
        { from: caller },
      );

      await expectBalances(fromAccountOwner, fromAccountNumber, market1, wei1);
      await expectBalances(fromAccountOwner, fromAccountNumber, market2, wei2);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market1, INTEGERS.ZERO);
      await expectBalances(borrowAccountOwner, borrowAccountNumber, market2, INTEGERS.ZERO);
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
