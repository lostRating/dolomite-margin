import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';

// eslint-disable-next-line import/prefer-default-export
export async function deployContract(
  dolomiteMargin: TestDolomiteMargin,
  json: any,
  args?: any[]
) {
  const contract = new dolomiteMargin.web3.eth.Contract(json.abi);
  const receipt = await contract
    .deploy({
      arguments: args,
      data: json.bytecode,
    })
    .send({
      from: dolomiteMargin.web3.eth.defaultAccount,
      gas: dolomiteMargin.contracts.getDefaultGasLimit(),
      gasPrice: dolomiteMargin.contracts.getDefaultGasPrice(),
    });
  contract.options.address = (receipt as any)._address;
  contract.options.from = dolomiteMargin.web3.eth.defaultAccount;
  return contract;
}
