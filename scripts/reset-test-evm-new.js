const Web3 = require('web3');
// eslint-disable-next-line
require('dotenv-flow').config();
const provider = new Web3.providers.HttpProvider(process.env.RPC_NODE_URI);
module.exports = {
    run: async () => {
        return new Promise((resolve) => {
            provider.send({
                method: 'evm_snapshot',
                params: [],
                jsonrpc: '2.0',
                id: new Date().getTime(),
            }, function (id) {
                if (id !== '0x1') {
                    provider.send({
                        method: 'evm_revert',
                        params: ['0x1'],
                        jsonrpc: '2.0',
                        id: new Date().getTime(),
                    }, function () {
                        provider.send({
                            method: 'evm_snapshot',
                            params: [],
                            jsonrpc: '2.0',
                            id: new Date().getTime(),
                        }, function () { resolve(); });
                    });
                } else {
                    resolve()
                }
            });
        })
    }
}
//# sourceMappingURL=reset-test-evm.js.map
