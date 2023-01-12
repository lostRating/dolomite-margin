import { TestDolomiteMargin } from '../modules/TestDolomiteMargin';
import Contract from 'web3/eth/contract';

// eslint-disable-next-line import/prefer-default-export
export async function deployContract<T extends Contract>(
  dolomiteMargin: TestDolomiteMargin,
  json: any,
  args?: any[],
) {
  const contract = new dolomiteMargin.web3.eth.Contract(json.abi) as T;
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
