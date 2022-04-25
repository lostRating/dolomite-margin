const truffleUtils = require('solidity-coverage/plugins/resources/truffle.utils');
const resetTestEvm = require('./scripts/reset-test-evm-new');
const snapshotTestEvm = require('./scripts/snapshot-test-evm-new');
const childProcess = require('child_process');
const chainId = 1002;
const port = 8555;

module.exports = {
  skipFiles: [
    'Migrations.sol',
    'external/oracles/TestChainlinkPriceOracleV1.sol',
    'external/multisig/MultiSig.sol',
    'external/multisig/DelayedMultiSig.sol',
    'external/rebalancers/',
    'external/uniswap-v2/',
    'external/utils/MultiCall.sol',
    'external/utils/ArbitrumMultiCall.sol',
    'testing/',
  ],
  providerOptions: {
    chainId: chainId,
    network_id: chainId,
    port: port,
    keepAliveTimeout: 600000,
  },
  port: port,
  client: require('ganache-cli'),
  onCompileComplete: async (config) => {
    await resetTestEvm.run();

    const truffle = truffleUtils.loadLibrary(config);
    await truffle.test.performInitialDeploy(config, config.resolver);

    await snapshotTestEvm.run();

    childProcess.execSync('npm run clean_contract_json', { stdio: 'inherit' });

    await new Promise(resolve => {
      setTimeout(() => resolve(), 1000000);
    })
  }
  // copyNodeModules: true,
  // testCommand: 'npm run test_cov',
};
