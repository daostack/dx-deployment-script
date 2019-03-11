import {
  Address,
  InitializeArcJs,
  Utils,
  Web3,
} from '@daostack/arc.js';
const abiDecoder = require('abi-decoder');

/**
 * List schemes in the given dao.
 * @param web3
 * @param networkName
 */
export const run = async (web3: Web3) => {

  // await InitializeArcJs(
  //   {
  //     filter: {}
  //   }
  // );

  return sendTransactionWithReferrer(
    web3,
    'ExternalTokenLockerMock',
    // contract address
    '0x21a59654176f2689d12e828b77a783072cd26680',
    'lock',
    // referrer address
    '0x1bf4e7D549fD7Bf9c6BA3Be8BD2b9Af62F086220',
    // the usual function arguments
    web3.toWei('1'), accounts[0]
  );
};

export const sendTransactionWithReferrer = async (
  web3: Web3,
  contractName: string,
  contractAddress: Address,
  functionName: string,
  referrerAddress: Address,
  ...functionParameters: Array<any>
): Promise<void> => {

  const truffleContract = await Utils.requireContract(contractName);

  const abi = truffleContract.abi.filter((entry: any) => entry.name === functionName)[0];

  // const contract = truffleContract.at(contractAddress);

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

  const txId = web3.eth.sendTransaction(payload);

  // console.log(`txId: ${txId}`);

  const tx = await web3.eth.getTransaction(txId);

  abi.inputs.push({
    name: '_referrer',
    type: 'address',
  });

  abiDecoder.addABI([abi]);

  const actualFunc = new SolidityFunction(
    web3.eth,
    abi,
    contractAddress
  );

  const actualInput = '0x' + actualFunc.signature() + tx.input.substr(signature.length + 2);
  const decodedData = abiDecoder.decodeMethod(actualInput);

  if (!decodedData.params) {
    throw new Error('did not obtain parameters');
  }

  const referrerParam = decodedData.params.filter((param: any) => param.name === '_referrer');

  if (!referrerParam.length) {
    throw new Error('did not obtain _referrer parameter');
  }

  if (referrerParam[0].value.toLowerCase() !== referrerAddress.toLowerCase()) {
    throw new Error('did not obtain _referrer address');
  }

  console.log('Success');

  return Promise.resolve();
};
