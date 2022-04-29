import { address } from '../../src';
import { expectThrow } from '../helpers/Expect';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import { mineAvgBlock, resetEVM, snapshot } from '../helpers/EVM';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';

let dolomiteMargin: TestDolomiteMargin;
let accounts: address[];
let snapshotId: string;
let admin: address;
let user: address;

describe('DolomiteAmmFactory', () => {
  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    accounts = r.accounts;
    admin = accounts[0];
    user = accounts[1];

    await resetEVM();

    expect(await dolomiteMargin.dolomiteAmmFactory.getPairInitCodeHash()).to.eql(
      await dolomiteMargin.dolomiteAmmRouterProxy.getPairInitCodeHash(),
    );

    await mineAvgBlock();

    snapshotId = await snapshot();
  });

  beforeEach(async () => {
    await resetEVM(snapshotId);
  });

  describe('#setFeeTo', () => {
    describe('Success cases', () => {
      it('Should work when called by the admin', async () => {
        await dolomiteMargin.dolomiteAmmFactory.setFeeTo(user, { from: admin });
        expect(await dolomiteMargin.dolomiteAmmFactory.feeTo()).to.eql(user);
      });
    });
    describe('Failure cases', () => {
      it('Should not work when called by non-admin', async () => {
        await expectThrow(
          dolomiteMargin.dolomiteAmmFactory.setFeeTo(user, { from: user }),
          'DolomiteAmmFactory: forbidden',
        );
      });
    });
  });

  describe('#setFeeToSetter', () => {
    describe('Success cases', () => {
      it('Should work when called by the admin', async () => {
        await dolomiteMargin.dolomiteAmmFactory.setFeeToSetter(user, { from: admin });
        expect(await dolomiteMargin.dolomiteAmmFactory.feeToSetter()).to.eql(user);
      });
    });
    describe('Failure cases', () => {
      it('Should not work when called by non-admin', async () => {
        await expectThrow(
          dolomiteMargin.dolomiteAmmFactory.setFeeToSetter(user, { from: user }),
          'DolomiteAmmFactory: forbidden',
        );
      });
    });
  });
});
