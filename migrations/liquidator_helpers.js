const {
  isArbitrumOne,
  isMaticProd,
  isProductionNetwork,
  isEthereumMainnet,
} = require('./helpers');

function getParaswapAugustusRouter(network, TestParaswapAugustusRouter) {
  if (isArbitrumOne(network) || isMaticProd(network) || isEthereumMainnet(network)) {
    return '0xDEF171Fe48CF0115B1d80b88dc8eAB59176FEe57';
  } else if (!isProductionNetwork(network)) {
    return TestParaswapAugustusRouter.address;
  }

  throw new Error('Could not find paraswap Augustus router for network: ' + network);
}

function getParaswapTransferProxy(network, TestParaswapTransferProxy) {
  if (isArbitrumOne(network) || isMaticProd(network) || isEthereumMainnet(network)) {
    return '0x216B4B4Ba9F3e719726886d34a177484278Bfcae';
  } else if (!isProductionNetwork(network)) {
    return TestParaswapTransferProxy.address;
  }

  throw new Error('Could not find paraswap transfer proxy for network: ' + network);
}

module.exports = {
  getParaswapAugustusRouter,
  getParaswapTransferProxy,
};
