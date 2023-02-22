import { address, Integer, INTEGERS } from '../../src';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import { resetEVM, snapshot } from '../helpers/EVM';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';
import { expectThrow } from '../helpers/Expect';

let dolomiteMargin: TestDolomiteMargin;
let snapshotId: string;
let admin: string;
let user: string;

let liquidatorProxyV1: string;
let liquidatorProxyV2: string;

const market1 = INTEGERS.ZERO;
const market2 = INTEGERS.ONE;

describe('LiquidatorAssetRegistry', () => {
  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    admin = r.accounts[0];
    user = r.accounts[1];
    await resetEVM();

    liquidatorProxyV1 = dolomiteMargin.liquidatorProxyV1.address;
    liquidatorProxyV2 = dolomiteMargin.liquidatorProxyV2WithExternalLiquidity.address;

    snapshotId = await snapshot();
  });

  beforeEach(async () => {
    await resetEVM(snapshotId);
  });

  describe('#addLiquidatorToAssetWhitelist', () => {
    it('should work when called by DolomiteMargin owner', async () => {
      await dolomiteMargin.liquidatorAssetRegistry.addLiquidatorToAssetWhitelist(
        market1,
        liquidatorProxyV1,
        { from: admin },
      );

      expect(await isAssetWhitelistedForLiquidation(market1, liquidatorProxyV1)).to.equal(true);
      expect(await isAssetWhitelistedForLiquidation(market1, liquidatorProxyV2)).to.equal(false);

      // the length of the set is 0 for market2, so everything should return true.
      expect(await isAssetWhitelistedForLiquidation(market2, liquidatorProxyV1)).to.equal(true);
      expect(await isAssetWhitelistedForLiquidation(market2, liquidatorProxyV2)).to.equal(true);
    });

    it('should fail when not called by DolomiteMargin owner', async () => {
      await expectThrow(
        dolomiteMargin.liquidatorAssetRegistry.addLiquidatorToAssetWhitelist(
          market1,
          liquidatorProxyV1,
          { from: user },
        ),
        `LiquidatorAssetRegistry: Only Dolomite owner can call <${user.toLowerCase()}>`
      );
    });
  });

  describe('#removeLiquidatorFromAssetWhitelist', () => {
    it('should work when called by DolomiteMargin owner', async () => {
      await dolomiteMargin.liquidatorAssetRegistry.addLiquidatorToAssetWhitelist(
        market1,
        liquidatorProxyV1,
        { from: admin },
      );
      await dolomiteMargin.liquidatorAssetRegistry.addLiquidatorToAssetWhitelist(
        market2,
        liquidatorProxyV2,
        { from: admin },
      );
      expect(await isAssetWhitelistedForLiquidation(market1, liquidatorProxyV1)).to.equal(true);
      expect(await isAssetWhitelistedForLiquidation(market1, liquidatorProxyV2)).to.equal(false);
      expect(await isAssetWhitelistedForLiquidation(market2, liquidatorProxyV1)).to.equal(false);
      expect(await isAssetWhitelistedForLiquidation(market2, liquidatorProxyV2)).to.equal(true);

      await dolomiteMargin.liquidatorAssetRegistry.removeLiquidatorFromAssetWhitelist(
        market1,
        liquidatorProxyV1,
        { from: admin },
      );
      await dolomiteMargin.liquidatorAssetRegistry.removeLiquidatorFromAssetWhitelist(
        market2,
        liquidatorProxyV2,
        { from: admin },
      );
      // the length of the set is 0 for market1 and market2, so everything should return true.
      expect(await isAssetWhitelistedForLiquidation(market1, liquidatorProxyV1)).to.equal(true);
      expect(await isAssetWhitelistedForLiquidation(market1, liquidatorProxyV2)).to.equal(true);
      expect(await isAssetWhitelistedForLiquidation(market2, liquidatorProxyV1)).to.equal(true);
      expect(await isAssetWhitelistedForLiquidation(market2, liquidatorProxyV2)).to.equal(true);
    });

    it('should fail when not called by DolomiteMargin owner', async () => {
      await expectThrow(
        dolomiteMargin.liquidatorAssetRegistry.removeLiquidatorFromAssetWhitelist(
          market1,
          liquidatorProxyV1,
          { from: user },
        ),
        `LiquidatorAssetRegistry: Only Dolomite owner can call <${user.toLowerCase()}>`
      );
    });
  });
});

async function isAssetWhitelistedForLiquidation(marketId: Integer, liquidator: address): Promise<boolean> {
  return dolomiteMargin.liquidatorAssetRegistry.isAssetWhitelistedForLiquidation(marketId, liquidator);
}
