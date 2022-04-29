import { getDolomiteMargin } from './helpers/DolomiteMargin';
import { TestDolomiteMargin } from './modules/TestDolomiteMargin';
import { resetEVM, snapshot } from './helpers/EVM';
import { setupMarkets } from './helpers/DolomiteMarginHelpers';
import { address } from '../src';

let dolomiteMargin: TestDolomiteMargin;
let accounts: address[];
let operator1: address;
let operator2: address;
let operator3: address;
let owner: address;

describe('Permission', () => {
  let snapshotId: string;

  before(async () => {
    const r = await getDolomiteMargin();
    dolomiteMargin = r.dolomiteMargin;
    accounts = r.accounts;

    await resetEVM();
    await setupMarkets(dolomiteMargin, accounts);

    owner = dolomiteMargin.getDefaultAccount();
    operator1 = accounts[6];
    operator2 = accounts[7];
    operator3 = accounts[8];

    snapshotId = await snapshot();
  });

  beforeEach(async () => {
    await resetEVM(snapshotId);
  });

  // ============ Getters for Risk ============

  describe('setOperators', () => {
    it('Succeeds for single approve', async () => {
      await expectOperator(operator1, false);
      const txResult = await dolomiteMargin.permissions.approveOperator(operator1, {
        from: owner,
      });
      await expectOperator(operator1, true);

      const logs = dolomiteMargin.logs.parseLogs(txResult);
      expect(logs.length).to.eql(1);
      const log = logs[0];
      expect(log.name).to.eql('LogOperatorSet');
      expect(log.args.owner).to.eql(owner);
      expect(log.args.operator).to.eql(operator1);
      expect(log.args.trusted).to.eql(true);
    });

    it('Succeeds for single disapprove', async () => {
      await dolomiteMargin.permissions.approveOperator(operator1, { from: owner });
      await expectOperator(operator1, true);
      const txResult = await dolomiteMargin.permissions.disapproveOperator(operator1, {
        from: owner,
      });
      await expectOperator(operator1, false);

      const logs = dolomiteMargin.logs.parseLogs(txResult);
      expect(logs.length).to.eql(1);
      const log = logs[0];
      expect(log.name).to.eql('LogOperatorSet');
      expect(log.args.owner).to.eql(owner);
      expect(log.args.operator).to.eql(operator1);
      expect(log.args.trusted).to.eql(false);
    });

    it('Succeeds for multiple approve/disapprove', async () => {
      const txResult = await dolomiteMargin.permissions.setOperators([
        { operator: operator1, trusted: true },
        {
          operator: operator2,
          trusted: false,
        },
        { operator: operator3, trusted: true },
      ]);

      const logs = dolomiteMargin.logs.parseLogs(txResult);
      expect(logs.length).to.eql(3);

      const [log1, log2, log3] = logs;
      expect(log1.name).to.eql('LogOperatorSet');
      expect(log1.args.owner).to.eql(owner);
      expect(log1.args.operator).to.eql(operator1);
      expect(log1.args.trusted).to.eql(true);
      expect(log2.name).to.eql('LogOperatorSet');
      expect(log2.args.owner).to.eql(owner);
      expect(log2.args.operator).to.eql(operator2);
      expect(log2.args.trusted).to.eql(false);
      expect(log3.name).to.eql('LogOperatorSet');
      expect(log3.args.owner).to.eql(owner);
      expect(log3.args.operator).to.eql(operator3);
      expect(log3.args.trusted).to.eql(true);

      await Promise.all([
        expectOperator(operator1, true),
        expectOperator(operator2, false),
        expectOperator(operator3, true),
      ]);
    });

    it('Succeeds for multiple repeated approve/disapprove', async () => {
      const txResult = await dolomiteMargin.permissions.setOperators([
        { operator: operator1, trusted: true },
        {
          operator: operator1,
          trusted: false,
        },
        { operator: operator2, trusted: true },
        { operator: operator2, trusted: true },
      ]);

      const logs = dolomiteMargin.logs.parseLogs(txResult);
      expect(logs.length).to.eql(4);

      const [log1, log2, log3, log4] = logs;
      expect(log1.name).to.eql('LogOperatorSet');
      expect(log1.args.owner).to.eql(owner);
      expect(log1.args.operator).to.eql(operator1);
      expect(log1.args.trusted).to.eql(true);
      expect(log2.name).to.eql('LogOperatorSet');
      expect(log2.args.owner).to.eql(owner);
      expect(log2.args.operator).to.eql(operator1);
      expect(log2.args.trusted).to.eql(false);
      expect(log3.name).to.eql('LogOperatorSet');
      expect(log3.args.owner).to.eql(owner);
      expect(log3.args.operator).to.eql(operator2);
      expect(log3.args.trusted).to.eql(true);
      expect(log4.name).to.eql('LogOperatorSet');
      expect(log4.args.owner).to.eql(owner);
      expect(log4.args.operator).to.eql(operator2);
      expect(log4.args.trusted).to.eql(true);

      await Promise.all([
        expectOperator(operator1, false),
        expectOperator(operator2, true),
      ]);
    });

    it('Skips logs when necessary', async () => {
      const txResult = await dolomiteMargin.permissions.approveOperator(operator1, {
        from: owner,
      });
      const logs = dolomiteMargin.logs.parseLogs(txResult, { skipPermissionLogs: true });
      expect(logs.length).to.eql(0);
    });
  });
});

async function expectOperator(operator: address, b: boolean) {
  const result = await dolomiteMargin.getters.getIsLocalOperator(owner, operator);
  expect(result).to.eql(b);
}
