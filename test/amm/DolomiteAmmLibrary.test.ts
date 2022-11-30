import BigNumber from 'bignumber.js';
import {
  address,
  ADDRESSES,
  INTEGERS,
} from '../../src';
import { expectThrow } from '../helpers/Expect';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import { setupMarkets } from '../helpers/DolomiteMarginHelpers';
import { mineAvgBlock, resetEVM, snapshot } from '../helpers/EVM';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';
import { TestToken } from '../modules/TestToken';

let dolomiteMargin: TestDolomiteMargin;
let accounts: address[];
let snapshotId: string;
let tokenA: TestToken;
let tokenB: TestToken;
let factory: address;
let initCodeHash: string;

const parA = new BigNumber('1000000000000000000');
const parB = new BigNumber('2000000');
const prices = [new BigNumber('1e20'), new BigNumber('1e32'), new BigNumber('1e18')];

describe('DolomiteAmmLibrary', () => {
  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    tokenA = dolomiteMargin.testing.tokenA;
    tokenB = dolomiteMargin.testing.tokenB;
    factory = dolomiteMargin.dolomiteAmmFactory.address;
    initCodeHash = await dolomiteMargin.dolomiteAmmFactory.getPairInitCodeHash();
    accounts = r.accounts;

    await resetEVM();
    await setupMarkets(dolomiteMargin, accounts);
    await Promise.all([
      dolomiteMargin.testing.priceOracle.setPrice(tokenA.address, prices[0]),
      dolomiteMargin.testing.priceOracle.setPrice(tokenB.address, prices[1]),
      dolomiteMargin.testing.priceOracle.setPrice(tokenB.address, prices[2]),
    ]);

    expect(await dolomiteMargin.dolomiteAmmFactory.getPairInitCodeHash()).to.eql(
      await dolomiteMargin.dolomiteAmmRouterProxy.getPairInitCodeHash(),
    );

    await Promise.all([
      dolomiteMargin.dolomiteAmmFactory.createPair(
        tokenA.address,
        tokenB.address,
      ),
    ]);

    expect(await dolomiteMargin.dolomiteAmmFactory.allPairsLength()).to.eql(INTEGERS.ONE);

    await mineAvgBlock();

    snapshotId = await snapshot();
  });

  beforeEach(async () => {
    await resetEVM(snapshotId);
  });

  describe('#getPools', () => {
    it('should fail when an invalid path is sent', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getPools(
            factory,
            initCodeHash,
            [],
          ),
        ),
        'DolomiteAmmLibrary: invalid path length'
      );
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getPools(
            factory,
            initCodeHash,
            [tokenA.address],
          ),
        ),
        'DolomiteAmmLibrary: invalid path length'
      );
    });
  });

  describe('#sortTokens', () => {
    it('should fail when the tokens are the same', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.sortTokens(
            tokenA.address,
            tokenA.address,
          ),
        ),
        'DolomiteAmmLibrary: identical addresses'
      );
    });

    it('should fail when a token is the 0 address', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.sortTokens(
            tokenA.address,
            ADDRESSES.ZERO,
          ),
        ),
        'DolomiteAmmLibrary: zero address'
      );
    });
  });

  describe('#quote', () => {
    it('should fail when amountA equals 0', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.quote(
            INTEGERS.ZERO.toFixed(),
            parA.toFixed(),
            parB.toFixed(),
          ),
        ),
        'DolomiteAmmLibrary: insufficient amount'
      );
    });

    it('should fail when reserves are 0', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.quote(
            parA.toFixed(),
            INTEGERS.ZERO.toFixed(),
            parB.toFixed(),
          ),
        ),
        'DolomiteAmmLibrary: insufficient liquidity'
      );
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.quote(
            parA.toFixed(),
            parA.toFixed(),
            INTEGERS.ZERO.toFixed(),
          ),
        ),
        'DolomiteAmmLibrary: insufficient liquidity'
      );
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.quote(
            parA.toFixed(),
            INTEGERS.ZERO.toFixed(),
            INTEGERS.ZERO.toFixed(),
          ),
        ),
        'DolomiteAmmLibrary: insufficient liquidity'
      );
    });
  });

  describe('#getAmountOut', () => {
    it('should fail when inputAmount equals 0', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountOut(
            INTEGERS.ZERO.toFixed(),
            parA.toFixed(),
            parB.toFixed(),
          ),
        ),
        'DolomiteAmmLibrary: insufficient input amount'
      );
    });

    it('should fail when reserves are 0', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountOut(
            parA.toFixed(),
            INTEGERS.ZERO.toFixed(),
            parB.toFixed(),
          ),
        ),
        'DolomiteAmmLibrary: insufficient liquidity'
      );
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountOut(
            parA.toFixed(),
            parA.toFixed(),
            INTEGERS.ZERO.toFixed(),
          ),
        ),
        'DolomiteAmmLibrary: insufficient liquidity'
      );
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountOut(
            parA.toFixed(),
            INTEGERS.ZERO.toFixed(),
            INTEGERS.ZERO.toFixed(),
          ),
        ),
        'DolomiteAmmLibrary: insufficient liquidity'
      );
    });
  });

  describe('#getAmountIn', () => {
    it('should fail when inputAmount equals 0', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountIn(
            INTEGERS.ZERO.toFixed(),
            parA.toFixed(),
            parB.toFixed(),
          ),
        ),
        'DolomiteAmmLibrary: insufficient output amount'
      );
    });

    it('should fail when reserves are 0', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountIn(
            parA.toFixed(),
            INTEGERS.ZERO.toFixed(),
            parB.toFixed(),
          ),
        ),
        'DolomiteAmmLibrary: insufficient liquidity'
      );
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountIn(
            parA.toFixed(),
            parA.toFixed(),
            INTEGERS.ZERO.toFixed(),
          ),
        ),
        'DolomiteAmmLibrary: insufficient liquidity'
      );
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountIn(
            parA.toFixed(),
            INTEGERS.ZERO.toFixed(),
            INTEGERS.ONE.toFixed(),
          ),
        ),
        'DolomiteAmmLibrary: insufficient liquidity'
      );
    });
  });

  describe('#getAmountsOutWei', () => {
    it('should fail when an invalid path is sent', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountsOutWei(
            factory,
            initCodeHash,
            parA.toFixed(),
            [],
          ),
        ),
        'DolomiteAmmLibrary: invalid path'
      );
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountsOutWei(
            factory,
            initCodeHash,
            parA.toFixed(),
            [tokenA.address],
          ),
        ),
        'DolomiteAmmLibrary: invalid path'
      );
    });
  });

  describe('#getAmountsInWei', () => {
    it('should fail when an invalid path is sent', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountsInWei(
            factory,
            initCodeHash,
            parA.toFixed(),
            [],
          ),
        ),
        'DolomiteAmmLibrary: invalid path'
      );
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountsInWei(
            factory,
            initCodeHash,
            parA.toFixed(),
            [tokenA.address],
          ),
        ),
        'DolomiteAmmLibrary: invalid path'
      );
    });
  });

  describe('#getAmountsIn', () => {
    it('should fail when an invalid path is sent', async () => {
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountsIn(
            factory,
            initCodeHash,
            parA.toFixed(),
            [],
          ),
        ),
        'DolomiteAmmLibrary: invalid path'
      );
      await expectThrow(
        dolomiteMargin.contracts.callConstantContractFunction(
          dolomiteMargin.contracts.testDolomiteAmmLibrary.methods.getAmountsIn(
            factory,
            initCodeHash,
            parA.toFixed(),
            [tokenA.address],
          ),
        ),
        'DolomiteAmmLibrary: invalid path'
      );
    });
  });
});
