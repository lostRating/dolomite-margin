import { address, ADDRESSES } from '../../src';
import { expectThrow } from '../helpers/Expect';
import { getDolomiteMargin } from '../helpers/DolomiteMargin';
import { mineAvgBlock, resetEVM, snapshot } from '../helpers/EVM';
import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';
import { TestToken } from '../modules/TestToken';
import { setupMarkets } from '../helpers/DolomiteMarginHelpers';

let dolomiteMargin: TestDolomiteMargin;
let accounts: address[];
let snapshotId: string;
let admin: address;
let user: address;
let tokenA: TestToken;
let tokenB: TestToken;

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

    await setupMarkets(dolomiteMargin, accounts);
    tokenA = dolomiteMargin.testing.tokenA;
    tokenB = dolomiteMargin.testing.tokenB;

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

  describe('#createPair', () => {
    describe('Success cases', () => {
      it('Should work when called by the admin', async () => {
        await dolomiteMargin.dolomiteAmmFactory.createPair(tokenA.address, tokenB.address);
      });
    });
    describe('Failure cases', () => {
      it('Should not work when called with the same token addresses', async () => {
        await expectThrow(
          dolomiteMargin.dolomiteAmmFactory.createPair(tokenA.address, tokenA.address),
          'DolomiteAmmFactory: identical address',
        );
      });

      it('Should not work when called with the zero address', async () => {
        await expectThrow(
          dolomiteMargin.dolomiteAmmFactory.createPair(tokenA.address, ADDRESSES.ZERO),
          'DolomiteAmmFactory: zero address',
        );
      });

      it('Should not work when pair already exists', async () => {
        await dolomiteMargin.dolomiteAmmFactory.createPair(tokenA.address, tokenB.address);

        await expectThrow(
          dolomiteMargin.dolomiteAmmFactory.createPair(tokenA.address, tokenB.address),
          'DolomiteAmmFactory: pair already exists',
        );
      });
    });
  });
});
