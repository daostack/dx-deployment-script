import {
  Web3,
} from '@daostack/arc.js';
const abiDecoder = require('abi-decoder');

/**
 * List schemes in the given dao.
 * @param web3
 * @param networkName
 */
export const run = async (
  web3: Web3,
  networkName: string): Promise<void> => {

  const abi = {
    constant: false,
    inputs: [
      {
        name: '_amount',
        type: 'uint256',
      },
      {
        name: '_beneficiary',
        type: 'address',
      },
    ],
    name: 'lock',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  };

  // tslint:disable-next-line: variable-name
  const SolidityFunction = require('truffle-contract/node_modules/web3/lib/web3/function');

  const func = new SolidityFunction(
    web3.eth,
    abi,
    '0x21a59654176f2689d12e828b77a783072cd26680'
  );

  const coder = require('truffle-contract/node_modules/web3/lib/solidity/coder');
  const signature = func.signature();
  const payload = {} as any;
  payload.to = '0x21a59654176f2689d12e828b77a783072cd26680';
  payload.from = accounts[0]; // ganache accounts[0]
  payload.data =
    '0x' +
    signature +
    coder.encodeParams(
      [...func._inputTypes, 'address'],
      [web3.toWei('1'), accounts[0], '0xffcf8fdee72ac11b5c542428b35eef5769c409f0']);

  const txId = web3.eth.sendTransaction(payload);

  console.log(`txId: ${txId}`);

  const tx = await web3.eth.getTransaction(txId);

  console.dir(tx);

  const actualAbi = {
    constant: false,
    inputs: [
      {
        name: '_amount',
        type: 'uint256',
      },
      {
        name: '_beneficiary',
        type: 'address',
      },
      {
        name: '_referrer',
        type: 'address',
      },
    ],
    name: 'lock',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  };

  abiDecoder.addABI([actualAbi]);

  const actualFunc = new SolidityFunction(
    web3.eth,
    actualAbi,
    '0x21a59654176f2689d12e828b77a783072cd26680'
  );

  const actualInput = '0x' + actualFunc.signature() + tx.input.substr(signature.length + 2);
  const decodedData = abiDecoder.decodeMethod(actualInput);

  console.dir(decodedData);

  return Promise.resolve();
};
