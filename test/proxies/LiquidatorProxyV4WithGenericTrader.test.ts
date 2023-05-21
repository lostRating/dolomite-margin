import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import * as testTokenJson from '../../build/contracts/CustomTestToken.json';
import * as testIsolationModeTokenJson from '../../build/contracts/TestIsolationModeToken.json';
import * as testLiquidityTokenUnwrapperTraderJson from '../../build/contracts/TestLiquidityTokenUnwrapperTrader.json';
import * as testLiquidityTokenWrapperTraderJson from '../../build/contracts/TestLiquidityTokenWrapperTrader.json';
import { CustomTestToken as TestTokenContract } from '../../build/testing_wrappers/CustomTestToken';
import { TestIsolationModeToken as TestIsolationModeTokenContract } from '../../build/testing_wrappers/TestIsolationModeToken';
import { TestLiquidityTokenUnwrapperTrader } from '../../build/testing_wrappers/TestLiquidityTokenUnwrapperTrader';
import { TestLiquidityTokenWrapperTrader } from '../../build/testing_wrappers/TestLiquidityTokenWrapperTrader';
import { address, ADDRESSES, ContractCallOptions, Integer, INTEGERS, TxResult } from '../../src';
import { GenericTraderParam, GenericTraderType } from '../../src/modules/GenericTraderProxyV1';
import { deployContract } from '../helpers/Deploy';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import { fastForward, mineAvgBlock, resetEVM, snapshot } from '../helpers/EVM';
import { expectThrow } from '../helpers/Expect';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';
import { TestIsolationModeToken } from '../modules/TestIsolationModeToken';
import { TestToken } from '../modules/TestToken';

let dolomiteMargin: TestDolomiteMargin;
let accounts: address[];
let admin: address;
let solidOwner: address;
let liquidOwner: address;
let operator: address;
let snapshotId: string;
let token1: address;
let token2: address;
let token3: address; // isolation mode
let token4: address; // isolation mode
let token5: address; // isolation mode
let token6: address; // isolation mode
let token1Contract: TestToken;
let token2Contract: TestToken;
let token3Contract: TestIsolationModeToken;
let token4Contract: TestIsolationModeToken;
let token5Contract: TestToken;
let token6Contract: TestToken;
let testLiquidityUnwrapper: TestLiquidityTokenUnwrapperTrader;
let testLiquidityWrapper: TestLiquidityTokenWrapperTrader;

const solidNumber = new BigNumber(111);
const liquidNumber = new BigNumber(222);
const market1 = INTEGERS.ZERO;
const market2 = INTEGERS.ONE;
const market3 = new BigNumber(2);
const market4 = new BigNumber(3);
const market5 = new BigNumber(4);
const market6 = new BigNumber(5);
const par1 = new BigNumber('1e18'); // $100; 1 unit
const par2 = par1.times('125'); // $125; 125 units
const par3 = par1.times('250'); // $250; 250 units
const par4 = par1.times('0.35'); // $350; 0.35 units
const par5 = par1.times('65'); // $650; 65 unites
const par6 = par1.times('75'); // $750; 75 units
const negPar = par1.negated(); // -$100; -1 unit
const price1 = new BigNumber('100000000000000000000'); // $100
const price2 = new BigNumber('1000000000000000000'); // $1
const price3 = new BigNumber('1000000000000000000'); // $1
const price4 = new BigNumber('1000000000000000000000'); // $1000
const price5 = new BigNumber('10000000000000000000'); // $10
const price6 = new BigNumber('10000000000000000000'); // $10
const defaultMarginPremium = INTEGERS.ZERO;
const defaultSpreadPremium = INTEGERS.ZERO;
const defaultMaxWei = INTEGERS.ZERO;
const defaultIsClosing = false;
const defaultIsRecyclable = false;
const marketIdToTokenMap = {};
const defaultExpiryTimeDelta = new BigNumber(5); // 5 seconds

const simpleMarketIdPath = [market1, market2];
const simpleAmountWeisPath = [par1, par2];

describe('LiquidatorProxyV4WithGenericTrader', () => {
  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    accounts = r.accounts;
    admin = accounts[0];
    solidOwner = dolomiteMargin.getDefaultAccount();
    liquidOwner = accounts[3];
    operator = accounts[6];

    await resetEVM();
    await setupMarkets();

    await dolomiteMargin.permissions.approveOperator(operator, { from: solidOwner });

    token1 = await dolomiteMargin.getters.getMarketTokenAddress(market1);
    token2 = await dolomiteMargin.getters.getMarketTokenAddress(market2);
    token3 = await dolomiteMargin.getters.getMarketTokenAddress(market3);
    token4 = await dolomiteMargin.getters.getMarketTokenAddress(market4);
    token5 = await dolomiteMargin.getters.getMarketTokenAddress(market5);
    token6 = await dolomiteMargin.getters.getMarketTokenAddress(market6);

    marketIdToTokenMap[market1.toFixed()] = token1;
    marketIdToTokenMap[market2.toFixed()] = token2;
    marketIdToTokenMap[market3.toFixed()] = token3;
    marketIdToTokenMap[market4.toFixed()] = token4;
    marketIdToTokenMap[market5.toFixed()] = token5;
    marketIdToTokenMap[market6.toFixed()] = token6;

    testLiquidityUnwrapper = await deployContract<TestLiquidityTokenUnwrapperTrader>(
      dolomiteMargin,
      testLiquidityTokenUnwrapperTraderJson,
      [token3, token2, dolomiteMargin.address],
    );
    testLiquidityWrapper = await deployContract<TestLiquidityTokenWrapperTrader>(
      dolomiteMargin,
      testLiquidityTokenWrapperTraderJson,
      [token2, token3, dolomiteMargin.address],
    );

    token1Contract = new TestToken(dolomiteMargin.contracts, dolomiteMargin.token, dolomiteMargin.contracts.tokenA);
    token2Contract = new TestToken(dolomiteMargin.contracts, dolomiteMargin.token, dolomiteMargin.contracts.tokenB);

    const testToken3RawContract = new dolomiteMargin.web3.eth.Contract(
      testIsolationModeTokenJson.abi,
      token3,
    ) as TestIsolationModeTokenContract;
    testToken3RawContract.options.from = dolomiteMargin.getDefaultAccount();
    token3Contract = new TestIsolationModeToken(dolomiteMargin.contracts, dolomiteMargin.token, testToken3RawContract);

    const testToken4RawContract = new dolomiteMargin.web3.eth.Contract(
      testIsolationModeTokenJson.abi,
      token4,
    ) as TestIsolationModeTokenContract;
    testToken4RawContract.options.from = dolomiteMargin.getDefaultAccount();
    token4Contract = new TestIsolationModeToken(dolomiteMargin.contracts, dolomiteMargin.token, testToken4RawContract);

    const testToken5RawContract = new dolomiteMargin.web3.eth.Contract(testTokenJson.abi, token5) as TestTokenContract;
    testToken5RawContract.options.from = dolomiteMargin.getDefaultAccount();
    token5Contract = new TestToken(dolomiteMargin.contracts, dolomiteMargin.token, testToken5RawContract);

    const testToken6RawContract = new dolomiteMargin.web3.eth.Contract(
      testIsolationModeTokenJson.abi,
      token6,
    ) as TestIsolationModeTokenContract;
    testToken6RawContract.options.from = dolomiteMargin.getDefaultAccount();
    token6Contract = new TestIsolationModeToken(dolomiteMargin.contracts, dolomiteMargin.token, testToken6RawContract);

    await token3Contract.setTokenConverterTrusted(testLiquidityUnwrapper.options.address, true);
    await token3Contract.setTokenConverterTrusted(testLiquidityWrapper.options.address, true);

    await Promise.all([
      token1Contract.issueTo(par1.times(1000), dolomiteMargin.address),
      token2Contract.issueTo(par2.times(1000), dolomiteMargin.address),
      token3Contract.issueTo(par3.times(1000), dolomiteMargin.address),
      token4Contract.issueTo(par4.times(1000), dolomiteMargin.address),
      token5Contract.issueTo(par5.times(1000), dolomiteMargin.address),
      token6Contract.issueTo(par6.times(1000), dolomiteMargin.address),
    ]);

    await mineAvgBlock();

    snapshotId = await snapshot();
  });

  beforeEach(async () => {
    await resetEVM(snapshotId);
  });

  describe('#liquidate', () => {
    const isOverCollateralized = false;
    describe('Success cases', () => {
      it('should succeed when', async () => {});
    });

    describe('Failure cases', () => {
      it('should fail when marketId path < 2', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [],
            simpleAmountWeisPath,
            [getParaswapTraderParam(par2)],
            null,
          ),
          'GenericTraderProxyBase: Invalid market path length',
        );
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market1],
            simpleAmountWeisPath,
            [getParaswapTraderParam(par2)],
            null,
          ),
          'GenericTraderProxyBase: Invalid market path length',
        );
      });

      it('should fail when first and last market are the same', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market1, market1],
            simpleAmountWeisPath,
            [getParaswapTraderParam(par2)],
            null,
          ),
          'GenericTraderProxyBase: Duplicate markets in path',
        );
      });

      it('should fail when amounts do not match markets length', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            simpleMarketIdPath,
            [par1],
            [getParaswapTraderParam(par2)],
            null,
          ),
          'GenericTraderProxyBase: Invalid amounts path length',
        );
      });

      it('should fail when amount at any index is 0', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            simpleMarketIdPath,
            [par1, INTEGERS.ZERO],
            [getParaswapTraderParam(par2)],
            null,
          ),
          'GenericTraderProxyBase: Invalid amount at index <1>',
        );
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            simpleMarketIdPath,
            [INTEGERS.ZERO, par2],
            [getParaswapTraderParam(par2)],
            null,
          ),
          'GenericTraderProxyBase: Invalid amount at index <0>',
        );
      });

      it('should fail when trader length is incorrect', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            simpleMarketIdPath,
            simpleAmountWeisPath,
            [],
            null,
          ),
          'GenericTraderProxyBase: Invalid traders params length',
        );
      });

      it('should fail when trader is invalid', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            simpleMarketIdPath,
            simpleAmountWeisPath,
            [traderWithInvalidAddress],
            null,
          ),
          'GenericTraderProxyBase: Invalid trader at index <0>',
        );
      });

      it('should fail when attempting to use a normal trader for an isolation mode token', async () => {
        const traderParam = getUnwrapperTraderParam(par2);
        traderParam.traderType = GenericTraderType.ExternalLiquidity;
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market3, market2],
            simpleAmountWeisPath,
            [traderParam],
            null,
          ),
          `GenericTraderProxyBase: Invalid isolation mode unwrapper <${market3.toFixed()}, ${traderParam.traderType}>`,
        );
      });

      it('should fail when attempting to unwrap into an isolation mode token', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market3, market4],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
            null,
          ),
          `GenericTraderProxyBase: Can't unwrap into isolation mode <${market3.toFixed()}, ${market4.toFixed()}>`,
        );
      });

      it('should fail when attempting to unwrap into an isolation mode token', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market1, market4],
            simpleAmountWeisPath,
            [getParaswapTraderParam(par2)],
            null,
          ),
          `GenericTraderProxyBase: Invalid isolation mode wrapper <${market4.toFixed()}, ${
            GenericTraderType.ExternalLiquidity
          }>`,
        );
      });

      it('should fail when attempting to incorrectly set the trader type to be an unwrapper or wrapper for non-isolation mode', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
            null,
          ),
          `GenericTraderProxyBase: Invalid trader type <${GenericTraderType.IsolationModeUnwrapper}>`,
        );
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [getWrapperTraderParam(par2)],
            null,
          ),
          `GenericTraderProxyBase: Invalid trader type <${GenericTraderType.IsolationModeWrapper}>`,
        );
      });

      it('should fail when the input for the unwrapper is invalid', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market4, market2],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
            null,
          ),
          `GenericTraderProxyBase: Invalid input for unwrapper <0, ${market4.toFixed()}>`,
        );
      });

      it('should fail when the output for the unwrapper is invalid', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market3, market1],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
            null,
          ),
          `GenericTraderProxyBase: Invalid output for unwrapper <1, ${market1.toFixed()}>`,
        );
      });

      it('should fail when the unwrapper trader is not trusted', async () => {
        await token3Contract.setTokenConverterTrusted(testLiquidityUnwrapper.options.address, false);
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market3, market2],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
            null,
          ),
          `GenericTraderProxyBase: Unwrapper trader not enabled <${testLiquidityUnwrapper.options.address.toLowerCase()}, ${market3.toFixed()}>`,
        );
      });

      it('should fail when the input for the wrapper is invalid', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market1, market3],
            simpleAmountWeisPath,
            [getWrapperTraderParam(par3)],
            null,
          ),
          `GenericTraderProxyBase: Invalid input for wrapper <0, ${market1.toFixed()}>`,
        );
      });

      it('should fail when the output for the wrapper is invalid', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market2, market4],
            simpleAmountWeisPath,
            [getWrapperTraderParam(par2)],
            null,
          ),
          `GenericTraderProxyBase: Invalid output for wrapper <1, ${market4.toFixed()}>`,
        );
      });

      it('should fail when the wrapper trader is not trusted', async () => {
        await token3Contract.setTokenConverterTrusted(testLiquidityWrapper.options.address, false);
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market2, market3],
            simpleAmountWeisPath,
            [getWrapperTraderParam(par2)],
            null,
          ),
          `GenericTraderProxyBase: Wrapper trader not enabled <${testLiquidityWrapper.options.address.toLowerCase()}, ${market3.toFixed()}>`,
        );
      });

      it('should fail when the maker account is address(0) and trader type is internal liquidity', async () => {
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [getInternalTraderParam(ADDRESSES.ZERO, INTEGERS.ZERO, par2)],
            null,
          ),
          'GenericTraderProxyBase: Invalid maker account owner <0>',
        );
      });

      it('should fail when the maker account is non-zero and trader type is external liquidity', async () => {
        const traderParam = getParaswapTraderParam(par2);
        traderParam.makerAccountOwner = ADDRESSES.ONE;
        await expectThrow(
          dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
            solidOwner,
            solidNumber,
            liquidOwner,
            liquidNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [traderParam],
            null,
          ),
          'GenericTraderProxyBase: Invalid maker account owner <0>',
        );
      });

      it('Fails for msg.sender is non-operator', async () => {
        await Promise.all([
          setUpBasicBalances(isOverCollateralized),
          dolomiteMargin.permissions.disapproveOperator(operator, { from: solidOwner }),
        ]);
        await expectThrow(
          liquidate([market2, market1], null, { from: operator }),
          `LiquidatorProxyBase: Sender not operator <${operator.toLowerCase()}>`,
        );
      });

      it('Fails if proxy is non-operator', async () => {
        await Promise.all([
          setUpBasicBalances(isOverCollateralized),
          dolomiteMargin.admin.setGlobalOperator(
            dolomiteMargin.liquidatorProxyV4WithGenericTrader.address,
            false,
            { from: admin },
          ),
        ]);
        await expectThrow(liquidate([market2, market1]), 'Storage: Unpermissioned global operator');
      });

      it('Fails if owed market is positive', async () => {
        await setUpBasicBalances(isOverCollateralized);
        await expectThrow(
          liquidate([market1, market2]), // swap the two markets so owed = held
          `LiquidatorProxyBase: Owed market cannot be positive <${market2.toFixed()}>`,
        );
      });

      it('Fails for liquid account & held market is negative', async () => {
        await setUpBasicBalances(isOverCollateralized);
        await dolomiteMargin.testing.setAccountBalance(liquidOwner, liquidNumber, market2, new BigNumber(-1));
        await expectThrow(
          liquidate([market2, market1]),
          `LiquidatorProxyBase: Held market cannot be negative <${market2.toFixed()}>`,
        );
      });

      it('Fails for liquid account if not actually under collateralized', async () => {
        await setUpBasicBalances(true);
        await expectThrow(
          liquidate([market2, market1]),
          `LiquidateOrVaporizeImpl: Unliquidatable account <${liquidOwner.toLowerCase()}, ${liquidNumber.toFixed()}>`,
        );
      });

      it('should fail when expiration passed through is incorrect', async () => {
        await setUpBasicBalances(true);
        const realExpiry = await setUpExpiration(market1);
        const randomExpiry = new BigNumber('123123123');
        await expectThrow(
          liquidate([market2, market1], randomExpiry),
          `LiquidatorProxyBase: Expiry mismatch <${realExpiry.toFixed()}, ${randomExpiry.toFixed()}>`,
        );
      });
    });
  });
});

// ============ Helper Functions ============

const traderWithInvalidAddress: GenericTraderParam = {
  traderType: GenericTraderType.ExternalLiquidity,
  makerAccountOwner: ADDRESSES.ZERO,
  makerAccountNumber: INTEGERS.ZERO,
  trader: ADDRESSES.ZERO,
  tradeData: ethers.utils.defaultAbiCoder.encode(['bytes'], ['0x0']),
};

function getUnwrapperTraderParam(minAmountOut: Integer): GenericTraderParam {
  return {
    traderType: GenericTraderType.IsolationModeUnwrapper,
    makerAccountOwner: ADDRESSES.ZERO,
    makerAccountNumber: INTEGERS.ZERO,
    trader: testLiquidityUnwrapper.options.address,
    tradeData: ethers.utils.defaultAbiCoder.encode(['uint256', 'bytes'], [minAmountOut.toFixed(), ['0x0']]),
  };
}

function getWrapperTraderParam(minAmountOut: Integer): GenericTraderParam {
  return {
    traderType: GenericTraderType.IsolationModeWrapper,
    makerAccountOwner: ADDRESSES.ZERO,
    makerAccountNumber: INTEGERS.ZERO,
    trader: testLiquidityWrapper.options.address,
    tradeData: ethers.utils.defaultAbiCoder.encode(['uint256', 'bytes'], [minAmountOut.toFixed(), ['0x0']]),
  };
}

function getInternalTraderParam(
  makerAccountOwner: address,
  makerAccountNumber: Integer,
  minAmountOut: Integer,
): GenericTraderParam {
  return {
    makerAccountOwner,
    makerAccountNumber,
    traderType: GenericTraderType.InternalLiquidity,
    trader: dolomiteMargin.contracts.testAutoTrader.options.address,
    tradeData: ethers.utils.defaultAbiCoder.encode(['uint256', 'bytes'], [minAmountOut.toFixed(), ['0x0']]),
  };
}

function getParaswapTraderParam(minAmountOut: Integer): GenericTraderParam {
  return {
    traderType: GenericTraderType.ExternalLiquidity,
    makerAccountOwner: ADDRESSES.ZERO,
    makerAccountNumber: INTEGERS.ZERO,
    trader: dolomiteMargin.contracts.testParaswapTrader.options.address,
    tradeData: ethers.utils.defaultAbiCoder.encode(['uint256', 'bytes'], [minAmountOut.toFixed(), ['0x0']]),
  };
}

async function setUpBasicBalances(isOverCollateralized: boolean) {
  await Promise.all([
    dolomiteMargin.testing.setAccountBalance(solidOwner, solidNumber, market1, par1),

    dolomiteMargin.testing.setAccountBalance(liquidOwner, liquidNumber, market1, negPar),
    dolomiteMargin.testing.setAccountBalance(
      liquidOwner,
      liquidNumber,
      market2,
      par2.times(isOverCollateralized ? '1.2' : '1.1'),
    ),
  ]);
}

async function setUpExpiration(
  market: Integer,
  timeDelta: Integer = defaultExpiryTimeDelta,
  shouldFastForward: boolean = true,
): Promise<Integer> {
  await dolomiteMargin.operation
    .initiate()
    .setExpiry({
      primaryAccountOwner: liquidOwner,
      primaryAccountId: liquidNumber,
      expiryArgs: [
        {
          timeDelta,
          accountOwner: liquidOwner,
          accountId: liquidNumber,
          marketId: market,
          forceUpdate: true,
        },
      ],
    })
    .commit({ from: liquidOwner });

  if (shouldFastForward) {
    await fastForward(timeDelta.toNumber() + (60 * 60 * 24));
  }

  return dolomiteMargin.expiry.getExpiry(liquidOwner, liquidNumber, market);
}

async function liquidate(
  markets: Integer[],
  expiration: Integer | null = null,
  options?: ContractCallOptions,
): Promise<TxResult> {
  return dolomiteMargin.liquidatorProxyV4WithGenericTrader.liquidate(
    solidOwner,
    solidNumber,
    liquidOwner,
    liquidNumber,
    markets,
    simpleAmountWeisPath,
    [getParaswapTraderParam(par2)],
    expiration,
    options,
  );
}

async function setupMarkets() {
  const token3Contract = await deployContract<TestIsolationModeTokenContract>(
    dolomiteMargin,
    testIsolationModeTokenJson,
    ['Dolomite Isolation: Test Token 3', 'TEST3', 18],
  );
  const token4Contract = await deployContract<TestIsolationModeTokenContract>(
    dolomiteMargin,
    testIsolationModeTokenJson,
    ['Dolomite Isolation: Test Token 4', 'TEST4', 18],
  );
  const token5Contract = await deployContract<TestTokenContract>(dolomiteMargin, testTokenJson, [
    'Test Token 5',
    'TEST5',
    18,
  ]);
  const token6Contract = await deployContract<TestTokenContract>(dolomiteMargin, testTokenJson, [
    'Test Token 6',
    'TEST6',
    18,
  ]);

  const token1 = dolomiteMargin.testing.tokenA.address;
  const token2 = dolomiteMargin.testing.tokenB.address;
  const token3 = token3Contract.options.address;
  const token4 = token4Contract.options.address;
  const token5 = token5Contract.options.address;
  const token6 = token6Contract.options.address;

  await Promise.all([
    dolomiteMargin.testing.priceOracle.setPrice(token1, price1),
    dolomiteMargin.testing.priceOracle.setPrice(token2, price2),
    dolomiteMargin.testing.priceOracle.setPrice(token3, price3),
    dolomiteMargin.testing.priceOracle.setPrice(token4, price4),
    dolomiteMargin.testing.priceOracle.setPrice(token5, price5),
    dolomiteMargin.testing.priceOracle.setPrice(token6, price6),
  ]);

  const tokens = [token1, token2, token3, token4, token5, token6];

  for (let i = 0; i < tokens.length; i += 1) {
    await dolomiteMargin.admin.addMarket(
      tokens[i],
      dolomiteMargin.testing.priceOracle.address,
      dolomiteMargin.testing.interestSetter.address,
      defaultMarginPremium,
      defaultSpreadPremium,
      defaultMaxWei,
      defaultIsClosing,
      defaultIsRecyclable,
      { from: accounts[0] },
    );
  }
}
