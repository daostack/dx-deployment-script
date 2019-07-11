import {
  Address,
  Hash,
  Utils,
  Web3,
} from '@daostack/arc.js';
const abiDecoder = require('abi-decoder');

export const run = async (web3: Web3) => {

  const referrerAddress = '0x1bf4e7D549fD7Bf9c6BA3Be8BD2b9Af62F086220';

  const txId = await sendTransactionWithReferrer(
    web3,
    'ExternalTokenLockerMock',
    // contract address
    '0x21a59654176f2689d12e828b77a783072cd26680',
    'lock',
    referrerAddress,
    // the usual function arguments
    [web3.toWei('1'), accounts[0]],
    // web3 config
    { gas: 25530 }
  );

  const referrerAddressFetched = await retrieveReferrerFromTransaction(
    web3,
    'ExternalTokenLockerMock',
    // contract address
    '0x21a59654176f2689d12e828b77a783072cd26680',
    'lock',
    txId
  );

  if (!referrerAddressFetched ||
    (referrerAddressFetched.toLowerCase() !== referrerAddress.toLowerCase())) {
    throw new Error('did not obtain _referrer address');
  }

  console.log('Success');
};

export const sendTransactionWithReferrer = async (
  web3: Web3,
  contractName: string,
  contractAddress: Address,
  functionName: string,
  referrerAddress: Address,
  functionParameters: Array<any>,
  web3Params?: any): Promise<Hash> => {

  const truffleContract = await Utils.requireContract(contractName);

  const abi = truffleContract.abi.filter((entry: any) => entry.name === functionName)[0];

  // tslint:disable-next-line: variable-name
  const SolidityFunction = require('web3/lib/web3/function');

  const func = new SolidityFunction(
    web3.eth,
    abi,
    contractAddress
  );

  const coder = require('web3/lib/solidity/coder');
  const signature = func.signature();
  const payload = {} as any;
  payload.to = contractAddress;
  payload.from = accounts[0];
  payload.data =
    '0x' +
    signature +
    coder.encodeParams(
      [...func._inputTypes, 'address'],
      [...functionParameters, referrerAddress]);

  if (web3Params) {
    Object.assign(payload, web3Params);
  }

  const txId = web3.eth.sendTransaction(payload);

  return Promise.resolve(txId);
};

export const retrieveReferrerFromTransaction = async (
  web3: Web3,
  contractName: string,
  contractAddress: Address,
  functionName: string,
  txId: Hash): Promise<Address> => {

  const truffleContract = await Utils.requireContract(contractName);

  const abi = truffleContract.abi.filter((entry: any) => entry.name === functionName)[0];

  abi.inputs.push({
    name: '_referrer',
    type: 'address',
  });

  abiDecoder.addABI([abi]);

  // tslint:disable-next-line: variable-name
  const SolidityFunction = require('web3/lib/web3/function');
  const actualFunc = new SolidityFunction(
    web3.eth,
    abi,
    contractAddress
  );

  const tx = await web3.eth.getTransaction(txId);
  const actualInput = '0x' + actualFunc.signature() + tx.input.substr(10);
  const decodedData = abiDecoder.decodeMethod(actualInput);

  if (!decodedData.params) {
    throw new Error('did not obtain parameters');
  }

  const referrerParam = decodedData.params.filter((param: any) => param.name === '_referrer');

  return Promise.resolve(referrerParam[0].value);
};
