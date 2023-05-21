import BigNumber from 'bignumber.js';
import { ethers } from 'ethers';
import * as testIsolationModeTokenJson from '../../build/contracts/TestIsolationModeToken.json';
import * as testLiquidityTokenUnwrapperTraderJson from '../../build/contracts/TestLiquidityTokenUnwrapperTrader.json';
import * as testLiquidityTokenWrapperTraderJson from '../../build/contracts/TestLiquidityTokenWrapperTrader.json';
import * as testTokenJson from '../../build/contracts/CustomTestToken.json';
import { CustomTestToken as TestTokenContract } from '../../build/testing_wrappers/CustomTestToken';
import { TestIsolationModeToken as TestIsolationModeTokenContract } from '../../build/testing_wrappers/TestIsolationModeToken';
import { TestLiquidityTokenUnwrapperTrader } from '../../build/testing_wrappers/TestLiquidityTokenUnwrapperTrader';
import { TestLiquidityTokenWrapperTrader } from '../../build/testing_wrappers/TestLiquidityTokenWrapperTrader';
import { address, ADDRESSES, Integer, INTEGERS } from '../../src';
import {
  GenericExpiryParam,
  GenericTraderParam,
  GenericTraderType, GenericTransferCollateralAmounts,
  GenericTransferCollateralParam,
} from '../../src/modules/GenericTraderProxyV1';
import { deployContract } from '../helpers/Deploy';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import { setGlobalOperator } from '../helpers/DolomiteMarginHelpers';
import { mineAvgBlock, resetEVM, snapshot } from '../helpers/EVM';
import { expectThrow } from '../helpers/Expect';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';
import { TestIsolationModeToken } from '../modules/TestIsolationModeToken';
import { TestToken } from '../modules/TestToken';

let dolomiteMargin: TestDolomiteMargin;
let accounts: address[];
let snapshotId: string;
let traderOwner: address;
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

const tradeAccountNumber = new BigNumber(111);
const originalAccountNumber = new BigNumber(0);
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
const defaultExpiryTimeDelta = new BigNumber(60 * 60); // 1 hour

const simpleMarketIdPath = [market1, market2];
const simpleAmountWeisPath = [par1, par2];

describe('GenericTraderProxyV1', () => {
  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    accounts = r.accounts;
    traderOwner = dolomiteMargin.getDefaultAccount();

    await resetEVM();
    await setGlobalOperator(dolomiteMargin, accounts, dolomiteMargin.genericTraderProxyV1.address);
    await setupMarkets();

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

    const testToken5RawContract = new dolomiteMargin.web3.eth.Contract(
      testTokenJson.abi,
      token5,
    ) as TestTokenContract;
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

  describe('#swapExactInputForOutput', () => {
    describe('Success cases', () => {
      it('should succeed when', async () => {
        await dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
          tradeAccountNumber,
          simpleMarketIdPath,
          simpleAmountWeisPath,
          [getParaswapTraderParam(par2)],
        );

        const [market1Balance, market2Balance] = await Promise.all([
          dolomiteMargin.getters.getAccountWei(traderOwner, tradeAccountNumber, market1),
          dolomiteMargin.getters.getAccountWei(traderOwner, tradeAccountNumber, market2),
        ]);

        expect(market1Balance).to.eql(par1.times(1000).minus(par2));
        expect(market2Balance).to.eql(par1.times(1000).plus(par2));
      });
    });

    describe('Failure cases', () => {
      it('should fail when marketId path < 2', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(tradeAccountNumber, [], simpleAmountWeisPath, [
            getParaswapTraderParam(par2),
          ]),
          'GenericTraderProxyBase: Invalid market path length',
        );
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market1],
            simpleAmountWeisPath,
            [getParaswapTraderParam(par2)],
          ),
          'GenericTraderProxyBase: Invalid market path length',
        );
      });

      it('should fail when first and last market are the same', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market1, market1],
            simpleAmountWeisPath,
            [getParaswapTraderParam(par2)],
          ),
          'GenericTraderProxyBase: Duplicate markets in path',
        );
      });

      it('should fail when amounts do not match markets length', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            simpleMarketIdPath,
            [par1],
            [getParaswapTraderParam(par2)],
          ),
          'GenericTraderProxyBase: Invalid amounts path length',
        );
      });

      it('should fail when amount at any index is 0', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            simpleMarketIdPath,
            [par1, INTEGERS.ZERO],
            [getParaswapTraderParam(par2)],
          ),
          'GenericTraderProxyBase: Invalid amount at index <1>',
        );
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            simpleMarketIdPath,
            [INTEGERS.ZERO, par2],
            [getParaswapTraderParam(par2)],
          ),
          'GenericTraderProxyBase: Invalid amount at index <0>',
        );
      });

      it('should fail when trader length is incorrect', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            simpleMarketIdPath,
            simpleAmountWeisPath,
            [],
          ),
          'GenericTraderProxyBase: Invalid traders params length',
        );
      });

      it('should fail when trader is invalid', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            simpleMarketIdPath,
            simpleAmountWeisPath,
            [traderWithInvalidAddress],
          ),
          'GenericTraderProxyBase: Invalid trader at index <0>',
        );
      });

      it('should fail when attempting to use a normal trader for an isolation mode token', async () => {
        const traderParam = getUnwrapperTraderParam(par2);
        traderParam.traderType = GenericTraderType.ExternalLiquidity;
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market3, market2],
            simpleAmountWeisPath,
            [traderParam],
          ),
          `GenericTraderProxyBase: Invalid isolation mode unwrapper <${market3.toFixed()}, ${traderParam.traderType}>`,
        );
      });

      it('should fail when attempting to unwrap into an isolation mode token', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market3, market4],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
          ),
          `GenericTraderProxyBase: Can't unwrap into isolation mode <${market3.toFixed()}, ${market4.toFixed()}>`,
        );
      });

      it('should fail when attempting to unwrap into an isolation mode token', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market1, market4],
            simpleAmountWeisPath,
            [getParaswapTraderParam(par2)],
          ),
          `GenericTraderProxyBase: Invalid isolation mode wrapper <${market4.toFixed()}, ${
            GenericTraderType.ExternalLiquidity
          }>`,
        );
      });

      it('should fail when attempting to incorrectly set the trader type to be an unwrapper or wrapper for non-isolation mode', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
          ),
          `GenericTraderProxyBase: Invalid trader type <${GenericTraderType.IsolationModeUnwrapper}>`,
        );
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [getWrapperTraderParam(par2)],
          ),
          `GenericTraderProxyBase: Invalid trader type <${GenericTraderType.IsolationModeWrapper}>`,
        );
      });

      it('should fail when the input for the unwrapper is invalid', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market4, market2],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
          ),
          `GenericTraderProxyBase: Invalid input for unwrapper <0, ${market4.toFixed()}>`,
        );
      });

      it('should fail when the output for the unwrapper is invalid', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market3, market1],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
          ),
          `GenericTraderProxyBase: Invalid output for unwrapper <1, ${market1.toFixed()}>`,
        );
      });

      it('should fail when the unwrapper trader is not trusted', async () => {
        await token3Contract.setTokenConverterTrusted(testLiquidityUnwrapper.options.address, false);
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market3, market2],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
          ),
          `GenericTraderProxyBase: Unwrapper trader not enabled <${testLiquidityUnwrapper.options.address.toLowerCase()}, ${market3.toFixed()}>`,
        );
      });

      it('should fail when the input for the wrapper is invalid', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market1, market3],
            simpleAmountWeisPath,
            [getWrapperTraderParam(par3)],
          ),
          `GenericTraderProxyBase: Invalid input for wrapper <0, ${market1.toFixed()}>`,
        );
      });

      it('should fail when the output for the wrapper is invalid', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market2, market4],
            simpleAmountWeisPath,
            [getWrapperTraderParam(par2)],
          ),
          `GenericTraderProxyBase: Invalid output for wrapper <1, ${market4.toFixed()}>`,
        );
      });

      it('should fail when the wrapper trader is not trusted', async () => {
        await token3Contract.setTokenConverterTrusted(testLiquidityWrapper.options.address, false);
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market2, market3],
            simpleAmountWeisPath,
            [getWrapperTraderParam(par2)],
          ),
          `GenericTraderProxyBase: Wrapper trader not enabled <${testLiquidityWrapper.options.address.toLowerCase()}, ${market3.toFixed()}>`,
        );
      });

      it('should fail when the maker account is address(0) and trader type is internal liquidity', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [getInternalTraderParam(ADDRESSES.ZERO, INTEGERS.ZERO, par2)],
          ),
          'GenericTraderProxyBase: Invalid maker account owner <0>',
        );
      });

      it('should fail when the maker account is non-zero and trader type is external liquidity', async () => {
        const traderParam = getParaswapTraderParam(par2);
        traderParam.makerAccountOwner = ADDRESSES.ONE;
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutput(
            tradeAccountNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [traderParam],
          ),
          'GenericTraderProxyBase: Invalid maker account owner <0>',
        );
      });
    });
  });

  describe('#swapExactInputForOutputAndModifyPosition', () => {
    describe('Success cases', () => {
      it('should succeed when', async () => {});
    });

    describe('Failure cases', () => {
      const defaultTransferAmount: GenericTransferCollateralAmounts = {
        marketId: market3,
        amountWei: par3,
      };

      const defaultTransferParam: GenericTransferCollateralParam = {
        fromAccountNumber: originalAccountNumber,
        toAccountNumber: tradeAccountNumber,
        transferAmounts: [defaultTransferAmount],
      };

      const defaultExpiryParam: GenericExpiryParam = {
        marketId: market2,
        expiryTimeDelta: defaultExpiryTimeDelta,
      };

      it('should fail when marketId path < 2', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(tradeAccountNumber, [], simpleAmountWeisPath, [
            getParaswapTraderParam(par2),
          ], defaultTransferParam, defaultExpiryParam),
          'GenericTraderProxyBase: Invalid market path length',
        );
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market1],
            simpleAmountWeisPath,
            [getParaswapTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          'GenericTraderProxyBase: Invalid market path length',
        );
      });

      it('should fail when first and last market are the same', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market1, market1],
            simpleAmountWeisPath,
            [getParaswapTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          'GenericTraderProxyBase: Duplicate markets in path',
        );
      });

      it('should fail when amounts do not match markets length', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            simpleMarketIdPath,
            [par1],
            [getParaswapTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          'GenericTraderProxyBase: Invalid amounts path length',
        );
      });

      it('should fail when amount at any index is 0', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            simpleMarketIdPath,
            [par1, INTEGERS.ZERO],
            [getParaswapTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          'GenericTraderProxyBase: Invalid amount at index <1>',
        );
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            simpleMarketIdPath,
            [INTEGERS.ZERO, par2],
            [getParaswapTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          'GenericTraderProxyBase: Invalid amount at index <0>',
        );
      });

      it('should fail when trader length is incorrect', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            simpleMarketIdPath,
            simpleAmountWeisPath,
            [],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          'GenericTraderProxyBase: Invalid traders params length',
        );
      });

      it('should fail when trader is invalid', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            simpleMarketIdPath,
            simpleAmountWeisPath,
            [traderWithInvalidAddress],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          'GenericTraderProxyBase: Invalid trader at index <0>',
        );
      });

      it('should fail when attempting to use a normal trader for an isolation mode token', async () => {
        const traderParam = getUnwrapperTraderParam(par2);
        traderParam.traderType = GenericTraderType.ExternalLiquidity;
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market3, market2],
            simpleAmountWeisPath,
            [traderParam],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          `GenericTraderProxyBase: Invalid isolation mode unwrapper <${market3.toFixed()}, ${traderParam.traderType}>`,
        );
      });

      it('should fail when attempting to unwrap into an isolation mode token', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market3, market4],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          `GenericTraderProxyBase: Can't unwrap into isolation mode <${market3.toFixed()}, ${market4.toFixed()}>`,
        );
      });

      it('should fail when attempting to unwrap into an isolation mode token', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market1, market4],
            simpleAmountWeisPath,
            [getParaswapTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          `GenericTraderProxyBase: Invalid isolation mode wrapper <${market4.toFixed()}, ${
            GenericTraderType.ExternalLiquidity
          }>`,
        );
      });

      it('should fail when attempting to incorrectly set the trader type to be an unwrapper or wrapper for non-isolation mode', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          `GenericTraderProxyBase: Invalid trader type <${GenericTraderType.IsolationModeUnwrapper}>`,
        );
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [getWrapperTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          `GenericTraderProxyBase: Invalid trader type <${GenericTraderType.IsolationModeWrapper}>`,
        );
      });

      it('should fail when the input for the unwrapper is invalid', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market4, market2],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          `GenericTraderProxyBase: Invalid input for unwrapper <0, ${market4.toFixed()}>`,
        );
      });

      it('should fail when the output for the unwrapper is invalid', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market3, market1],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          `GenericTraderProxyBase: Invalid output for unwrapper <1, ${market1.toFixed()}>`,
        );
      });

      it('should fail when the unwrapper trader is not trusted', async () => {
        await token3Contract.setTokenConverterTrusted(testLiquidityUnwrapper.options.address, false);
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market3, market2],
            simpleAmountWeisPath,
            [getUnwrapperTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          `GenericTraderProxyBase: Unwrapper trader not enabled <${testLiquidityUnwrapper.options.address.toLowerCase()}, ${market3.toFixed()}>`,
        );
      });

      it('should fail when the input for the wrapper is invalid', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market1, market3],
            simpleAmountWeisPath,
            [getWrapperTraderParam(par3)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          `GenericTraderProxyBase: Invalid input for wrapper <0, ${market1.toFixed()}>`,
        );
      });

      it('should fail when the output for the wrapper is invalid', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market2, market4],
            simpleAmountWeisPath,
            [getWrapperTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          `GenericTraderProxyBase: Invalid output for wrapper <1, ${market4.toFixed()}>`,
        );
      });

      it('should fail when the wrapper trader is not trusted', async () => {
        await token3Contract.setTokenConverterTrusted(testLiquidityWrapper.options.address, false);
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market2, market3],
            simpleAmountWeisPath,
            [getWrapperTraderParam(par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          `GenericTraderProxyBase: Wrapper trader not enabled <${testLiquidityWrapper.options.address.toLowerCase()}, ${market3.toFixed()}>`,
        );
      });

      it('should fail when the maker account is address(0) and trader type is internal liquidity', async () => {
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [getInternalTraderParam(ADDRESSES.ZERO, INTEGERS.ZERO, par2)],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          'GenericTraderProxyBase: Invalid maker account owner <0>',
        );
      });

      it('should fail when the maker account is non-zero and trader type is external liquidity', async () => {
        const traderParam = getParaswapTraderParam(par2);
        traderParam.makerAccountOwner = ADDRESSES.ONE;
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [traderParam],
            defaultTransferParam,
            defaultExpiryParam,
          ),
          'GenericTraderProxyBase: Invalid maker account owner <0>',
        );
      });

      it('should fail when the transfer amounts array is empty', async () => {
        const transferParam: GenericTransferCollateralParam = {
          fromAccountNumber: originalAccountNumber,
          toAccountNumber: tradeAccountNumber,
          transferAmounts: [],
        };
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [getParaswapTraderParam(par2)],
            transferParam,
            defaultExpiryParam,
          ),
          'GenericTraderProxyV1: Invalid transfer amounts length',
        );
      });

      it('should fail when the transfer is to the same account number', async () => {
        const transferParam: GenericTransferCollateralParam = {
          fromAccountNumber: originalAccountNumber,
          toAccountNumber: originalAccountNumber,
          transferAmounts: [defaultTransferAmount],
        };
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [getParaswapTraderParam(par2)],
            transferParam,
            defaultExpiryParam,
          ),
          'GenericTraderProxyV1: Cannot transfer to same account',
        );
      });

      it('should fail when a transfer is is for an amount of 0', async () => {
        const transferAmount: GenericTransferCollateralAmounts = {
          marketId: market3,
          amountWei: INTEGERS.ZERO,
        };
        const transferParam: GenericTransferCollateralParam = {
          fromAccountNumber: tradeAccountNumber,
          toAccountNumber: originalAccountNumber,
          transferAmounts: [transferAmount],
        };
        await expectThrow(
          dolomiteMargin.genericTraderProxyV1.swapExactInputForOutputAndModifyPosition(
            tradeAccountNumber,
            [market1, market2],
            simpleAmountWeisPath,
            [getParaswapTraderParam(par2)],
            transferParam,
            defaultExpiryParam,
          ),
          'GenericTraderProxyV1: Invalid transfer amount at index <0>',
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
  const token5Contract = await deployContract<TestTokenContract>(
    dolomiteMargin,
    testTokenJson,
    ['Test Token 5', 'TEST5', 18],
  );
  const token6Contract = await deployContract<TestTokenContract>(
    dolomiteMargin,
    testTokenJson,
    ['Test Token 6', 'TEST6', 18],
  );

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
