const Web3 = require('web3');
// eslint-disable-next-line
require('dotenv-flow').config();
module.exports = {
    run: async () => {
        const provider = new Web3.providers.HttpProvider(process.env.RPC_NODE_URI);
        return new Promise((resolve) => {
            provider.send({
                method: 'evm_snapshot',
                params: [],
                jsonrpc: '2.0',
                id: new Date().getTime(),
            }, function () { resolve() });
        })
    }
}
//# sourceMappingURL=snapshot-test-evm.js.map
