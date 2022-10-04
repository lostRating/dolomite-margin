const { isMaticProd,
  isArbitrumOne,
  isProductionNetwork,
} = require('./helpers');

function getRebalancerV1Routers(network) {
  const sushiSwapRouter = '0x1b02dA8Cb0d097eB8D57A175b88c7D8b47997506';
  if (isArbitrumOne(network)) {
    return [sushiSwapRouter];
  } else if (isMaticProd(network)) {
    return [sushiSwapRouter];
  } else if (!isProductionNetwork(network)) {
    return [];
  }

  throw new Error('Could not find rebalancer params for network: ' + network);
}

function getRebalancerV1InitHashes(network) {
  const sushiInitCodeHash = '0xe18a34eb0e04b04f7a0ac29a6e80748dca96319b42c54d679cb821dca90c6303';
  if (isArbitrumOne(network)) {
    return [sushiInitCodeHash];
  } else if (isMaticProd(network)) {
    return [sushiInitCodeHash];
  } else if (!isProductionNetwork(network)) {
    return [];
  }

  throw new Error('Could not find rebalancer params for network: ' + network);
}

module.exports = {
  getRebalancerV1Routers,
  getRebalancerV1InitHashes
}
