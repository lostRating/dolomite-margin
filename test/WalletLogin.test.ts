import { address, SigningMethod } from '../src';
import { getDolomiteMargin } from './helpers/DolomiteMargin';
import { TestDolomiteMargin } from './modules/TestDolomiteMargin';

let dolomiteMargin: TestDolomiteMargin;
let accounts: address[];
let signer: address;

describe('WalletLogin', () => {
  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    accounts = r.accounts;
    signer = accounts[0];
  });

  it('Succeeds for eth.sign', async () => {
    const expiration = new Date('December 30, 2500 11:20:25');
    const signature = await dolomiteMargin.walletLogin.signLogin(
      expiration,
      signer,
      SigningMethod.Hash,
    );
    expect(
      dolomiteMargin.walletLogin.walletLoginIsValid(expiration, signature, signer),
    ).to.eql(true);
  });

  it('Succeeds for eth_signTypedData', async () => {
    const expiration = new Date('December 30, 2500 11:20:25');
    const signature = await dolomiteMargin.walletLogin.signLogin(
      expiration,
      signer,
      SigningMethod.TypedData,
    );
    expect(
      dolomiteMargin.walletLogin.walletLoginIsValid(expiration, signature, signer),
    ).to.eql(true);
  });

  it('Recognizes an invalid signature', async () => {
    const expiration = new Date('December 30, 2500 11:20:25');
    const signature = `0x${'1b'.repeat(65)}00`;
    expect(
      dolomiteMargin.walletLogin.walletLoginIsValid(expiration, signature, signer),
    ).to.eql(false);
  });

  it('Recognizes expired signatures', async () => {
    const expiration = new Date('December 30, 2017 11:20:25');
    const signature = await dolomiteMargin.walletLogin.signLogin(
      expiration,
      signer,
      SigningMethod.Hash,
    );
    expect(
      dolomiteMargin.walletLogin.walletLoginIsValid(expiration, signature, signer),
    ).to.eql(false);
  });
});
