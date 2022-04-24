import BigNumber from 'bignumber.js';
import TestTokenJSON from '../build/contracts/TestToken.json';
import { TestToken } from '../build/testing_wrappers/TestToken';
import { address, AmountDenomination, AmountReference, Integer, INTEGERS } from '../src';
import { expectThrow } from '../src/lib/Expect';
import { deployContract } from './helpers/Deploy';
import { getDolomiteMargin } from './helpers/DolomiteMargin';
import { setupMarkets } from './helpers/DolomiteMarginHelpers';
import { resetEVM, snapshot } from './helpers/EVM';
import { TestDolomiteMargin } from './modules/TestDolomiteMargin';

let user: address;
let admin: address;
let dolomiteMargin: TestDolomiteMargin;
let accounts: address[];
const accountOne = new BigNumber(111);
const accountTwo = new BigNumber(222);
const amount = new BigNumber(100);

describe('AddManyMarkets', () => {
  let snapshotId: string;

  beforeAll(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    accounts = r.accounts;
    admin = accounts[0];
    user = dolomiteMargin.getDefaultAccount();

    await resetEVM();
    await setupMarkets(dolomiteMargin, accounts);
    await Promise.all([
      dolomiteMargin.testing.tokenA.issueTo(amount, user),
      dolomiteMargin.testing.tokenA.setMaximumDolomiteMarginAllowance(user),
    ]);
    snapshotId = await snapshot();
  });

  beforeEach(async () => {
    await resetEVM(snapshotId);
  });

  it('should work for many markets without crazy gas prices', async () => {
    console.log('\tNumber of markets before:', (await dolomiteMargin.getters.getNumMarkets()).toFixed());

    const tokens: TestToken[] = [];
    const marketIds: Integer[] = [];

    const numberOfMarkets = 257;
    for (let i = 0; i < numberOfMarkets; i += 1) {
      const priceOracle = dolomiteMargin.testing.priceOracle.address;
      const interestSetter = dolomiteMargin.testing.interestSetter.address;
      const price = new BigNumber('1e40'); // large to prevent hitting minBorrowValue check
      const marginPremium = new BigNumber(0);
      const spreadPremium = new BigNumber(0);
      const maxWei = new BigNumber(0);
      const isClosing = false;
      const isRecyclable = false;

      tokens[i] = (await deployContract(dolomiteMargin, TestTokenJSON)) as TestToken;

      await dolomiteMargin.testing.priceOracle.setPrice(tokens[i].options.address, price);
      const txResult = await dolomiteMargin.admin.addMarket(
        tokens[i].options.address,
        priceOracle,
        interestSetter,
        marginPremium,
        spreadPremium,
        maxWei,
        isClosing,
        isRecyclable,
        { from: admin },
      );
      if (i === numberOfMarkets - 1) {
        console.log('\tAdd market gas cost for last market:', txResult.gasUsed);
      }
      marketIds[i] = await dolomiteMargin.getters.getMarketIdByTokenAddress(tokens[i].options.address);
    }
    console.log('\tNumber of markets after:', (await dolomiteMargin.getters.getNumMarkets()).toFixed());

    await performDeposit(accountOne, 0, tokens, marketIds, true);
    await performDeposit(accountOne, 49, tokens, marketIds, true);
    await performDeposit(accountOne, 99, tokens, marketIds, true);
    await performDeposit(accountOne, 149, tokens, marketIds, true);
    await performDeposit(accountOne, 199, tokens, marketIds, true);
    await performDeposit(accountOne, numberOfMarkets - 1, tokens, marketIds, true);

    let cumulativeGasUsed = 0;
    const numberOfDeposits = 32;
    for (let i = 0; i < numberOfDeposits; i += 1) {
      const logGasUsage = i > numberOfDeposits - 6;
      cumulativeGasUsed += await performDeposit(accountTwo, i * 2, tokens, marketIds, logGasUsage);
    }
    console.log(
      `\tAveraged gas used for deposit into account ${accountTwo.toFixed()}:`,
      cumulativeGasUsed / numberOfDeposits,
    );

    const numberOfMarketsWithBalances = await dolomiteMargin.getters.getAccountNumberOfMarketsWithBalances(
      user,
      accountTwo,
    );
    expect(numberOfMarketsWithBalances).toEqual(new BigNumber(numberOfDeposits));

    // The 33rd one should throw
    await expectThrow(
      performDeposit(accountTwo, numberOfMarkets - 1, tokens, marketIds),
      `OperationImpl: Too many non-zero balances <${user.toLowerCase()}, ${accountTwo.toFixed()}>`,
    );
  });

  const performDeposit = async (
    primaryAccountId: Integer,
    index: number,
    tokens: TestToken[],
    marketIds: Integer[],
    shouldLogGasUsage: boolean = false,
  ) => {
    await dolomiteMargin.contracts.callContractFunction(tokens[index].methods.issueTo(user, amount.toFixed(0)), {
      from: user,
    });
    await dolomiteMargin.contracts.callContractFunction(
      tokens[index].methods.approve(dolomiteMargin.address, INTEGERS.ONES_255.toFixed(0)),
      { from: user },
    );
    const txResult = await dolomiteMargin.operation
      .initiate()
      .deposit({
        primaryAccountId,
        primaryAccountOwner: user,
        marketId: marketIds[index],
        amount: {
          denomination: AmountDenomination.Wei,
          reference: AmountReference.Delta,
          value: amount,
        },
        from: user,
      })
      .commit({ from: user });

    if (shouldLogGasUsage) {
      console.log(`\tGas used for deposit into account ${primaryAccountId.toFixed()}:`, txResult.gasUsed);
    }

    return txResult.gasUsed;
  };
});
