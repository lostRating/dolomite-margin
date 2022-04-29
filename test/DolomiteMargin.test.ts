import { TestDolomiteMargin } from './modules/TestDolomiteMargin';
import { provider } from './helpers/Provider';
import DolomiteMarginJson from '../build/contracts/DolomiteMargin.json';
import OperationImplJson from '../build/contracts/OperationImpl.json';
import AdminImplJson from '../build/contracts/AdminImpl.json';
import CallImplJson from '../build/contracts/CallImpl.json';
import DepositImplJson from '../build/contracts/DepositImpl.json';
import LiquidateOrVaporizeImplJson from '../build/contracts/LiquidateOrVaporizeImpl.json';
import TradeImplJson from '../build/contracts/TradeImpl.json';
import TransferImplJson from '../build/contracts/TransferImpl.json';
import WithdrawalImplJson from '../build/contracts/WithdrawalImpl.json';

describe('DolomiteMargin', () => {
  it('Initializes a new instance successfully', async () => {
    new TestDolomiteMargin(provider, Number(process.env.NETWORK_ID));
  });

  it('Has a bytecode that does not exceed the maximum', async () => {
    if (process.env.COVERAGE === 'true') {
      return;
    }

    // Max size is 0x6000 (= 24576) bytes
    const maxSize = 24576 * 2; // 2 characters per byte
    expect(DolomiteMarginJson.deployedBytecode.length).to.be.lessThan(maxSize);
    expect(CallImplJson.deployedBytecode.length).to.be.lessThan(maxSize);
    expect(DepositImplJson.deployedBytecode.length).to.be.lessThan(maxSize);
    expect(LiquidateOrVaporizeImplJson.deployedBytecode.length).to.be.lessThan(maxSize);
    expect(TradeImplJson.deployedBytecode.length).to.be.lessThan(maxSize);
    expect(TransferImplJson.deployedBytecode.length).to.be.lessThan(maxSize);
    expect(WithdrawalImplJson.deployedBytecode.length).to.be.lessThan(maxSize);
    expect(OperationImplJson.deployedBytecode.length).to.be.lessThan(maxSize);
    expect(AdminImplJson.deployedBytecode.length).to.be.lessThan(maxSize);
  });
});
