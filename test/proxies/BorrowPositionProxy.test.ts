import BigNumber from 'bignumber.js';
import { address, Integer, INTEGERS } from '../../src';
import { expectThrow } from '../helpers/Expect';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import { setupMarkets } from '../helpers/DolomiteMarginHelpers';
import { resetEVM, snapshot } from '../helpers/EVM';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';

let dolomiteMargin: TestDolomiteMargin;
let accounts: address[];
let snapshotId: string;
let admin: address;
let owner1: address;

const accountIndex0 = INTEGERS.ZERO;
const accountIndexBorrow = INTEGERS.ZERO;
const market1 = INTEGERS.ZERO;
const market2 = INTEGERS.ONE;
const zero = INTEGERS.ZERO;
const par1 = new BigNumber(500);
const par2 = new BigNumber(100);
const defaultIsClosing = false;
const defaultIsRecyclable = false;

let token1: address;
let token2: address;

describe('BorrowPositionProxy', () => {
  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    accounts = r.accounts;
    admin = accounts[0];
    owner1 = dolomiteMargin.getDefaultAccount();
    await resetEVM();
    await Promise.all([
      setupMarkets(dolomiteMargin, accounts),
      dolomiteMargin.testing.priceOracle.setPrice(
        dolomiteMargin.weth.address,
        new BigNumber('1e40'),
      ),
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
    await dolomiteMargin.testing.setAccountBalance(owner1, INTEGERS.ZERO, market1, par1);
    await dolomiteMargin.testing.setAccountBalance(owner1, INTEGERS.ZERO, market2, par2);
    token1 = await dolomiteMargin.getters.getMarketTokenAddress(market1);
    token2 = await dolomiteMargin.getters.getMarketTokenAddress(market2);
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
