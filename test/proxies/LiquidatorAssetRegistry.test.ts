import { INTEGERS } from '../../src';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import { resetEVM, snapshot } from '../helpers/EVM';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';

let dolomiteMargin: TestDolomiteMargin;
let snapshotId: string;

const market1 = INTEGERS.ZERO;
const market2 = INTEGERS.ONE;

describe('BorrowPositionProxyV1', () => {
  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    await resetEVM();

    snapshotId = await snapshot();
  });

  beforeEach(async () => {
    await resetEVM(snapshotId);
  });

  describe('#addLiquidatorToAssetWhitelist', () => {
    it('should work when called by DolomiteMargin owner', async () => {});

    it('should fail when not called by DolomiteMargin owner', async () => {});
  });

  describe('#removeLiquidatorFromAssetWhitelist', () => {
    it('should work when called by DolomiteMargin owner', async () => {});

    it('should fail when not called by DolomiteMargin owner', async () => {});
  });
});
