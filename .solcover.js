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
  deepSkip: false,
  copyNodeModules: true,
  testCommand: 'npm run test_cov',
  providerOptions: {
    chainId: chainId,
    network_id: chainId,
    port: port,
    keepAliveTimeout: 600000,
  },
  port: port,
  norpc: true,
  // testrpcOptions:
    // '--port 8555 -i 1002 --chainId 1002 --keepAliveTimeout 600000 --allowUnlimitedContractSize --gasLimit 0xfffffffffff --gasPrice 1',
    // '--port 8555 -i 1002 --keepAliveTimeout 600000 --allowUnlimitedContractSize --gasLimit 0xfffffffffff --gasPrice 1',
};
