import {
  Address,
  Hash,
  Locking4ReputationLockEventResult,
  Utils,
  Web3,
} from '@daostack/arc.js';
const abiDecoder = require('abi-decoder');

export const run = async (web3: Web3) => {

  //  const referrerAddress = '0x1bf4e7D549fD7Bf9c6BA3Be8BD2b9Af62F086220';

  // await sendTransactionWithReferrer(
  //   web3,
  //   'LockingEth4Reputation',
  //   // contract address
  //   '0xdb56f2e9369e0d7bd191099125a3f6c370f8ed15',
  //   'lock',
  //   referrerAddress,
  //   // the usual function arguments
  //   [10000],
  //   // web3 config
  //   { value: web3.toWei('.1'), gas: 6100000 }
  // );

  await printEvents(
    web3,
    'LockingEth4Reputation',
    '0xdb56f2e9369e0d7bd191099125a3f6c370f8ed15',
    'lock',
    'Lock');
  await printEvents(
    web3,
    'LockingEth4Reputation',
    '0xdb56f2e9369e0d7bd191099125a3f6c370f8ed15',
    'release',
    'Release');
  await printEvents(
    web3,
    'LockingToken4Reputation',
    '0xa94b7f0465e98609391c623d0560c5720a3f2d33',
    'lock',
    'Lock');
  await printEvents(
    web3,
    'LockingToken4Reputation',
    '0xa94b7f0465e98609391c623d0560c5720a3f2d33',
    'release',
    'Release');
  await printEvents(
    web3,
    'ExternalLocking4Reputation',
    '0x6ed79aa1c71fd7bdbc515efda3bd4e26394435cc',
    'register',
    'Register');
  await printEvents(
    web3,
    'ExternalLocking4Reputation',
    '0x6ed79aa1c71fd7bdbc515efda3bd4e26394435cc',
    'claim',
    'Lock');
  await printEvents(
    web3,
    'Auction4Reputation',
    '0xb09bcc172050fbd4562da8b229cf3e45dc3045a6',
    'bid',
    'Bid');
};

const printEvents = async (
  web3: Web3,
  contractName: string,
  contractAddress: Address,
  methodName: string,
  eventName: string) => {

  console.log(`${contractName}: fetching events for ${methodName}...`);

  const eventsFetched = await retrieveReferrersFromEvent(
    web3,
    contractName,
    contractAddress,
    methodName,
    eventName
  );

  if (!eventsFetched.length) {
    console.log('  no events found');
  }

  for (const event of eventsFetched) {
    // tslint:disable-next-line: max-line-length
    let output = '';
    // tslint:disable-next-line: forin
    for (const key in event) {
      if (output.length) {
        output = output + ' | ';
      }
      output = output + `${key}: ${event[key]}`;
    }
    console.log(`  ${output}`);
  }
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

  return web3.eth.sendTransaction(payload);
};

/**
 * TODO: make more generic to event types
 * @param web3
 * @param contractName
 * @param contractAddress
 * @param functionName
 */
export const retrieveReferrersFromEvent = async (
  web3: Web3,
  contractName: string,
  contractAddress: Address,
  functionName: string,
  eventName: string): Promise<Array<ILegalLockInfo>> => {

  const truffleContract = await Utils.requireContract(contractName);
  const contract = await truffleContract.at(contractAddress);
  return new Promise<Array<ILegalLockInfo>>(
    (resolve: (result: Array<ILegalLockInfo>) => void, reject: (error: Error) => void): void => {

      contract[eventName]({}, { fromBlock: 0 }).get(
        async (
          error: Error,
          logs: Array<any>): Promise<void> => {
          if (error) {
            return reject(error);
          }

          if (!Array.isArray(logs)) {
            logs = [logs];
          }

          const results = new Array<ILegalLockInfo>();

          for (const log of logs) {
            const txId = log.transactionHash;
            const legalContractHash = await retrieveLegalContractHashFromTransaction(
              web3,
              contractName,
              contractAddress,
              functionName,
              txId
            );
            if (typeof (legalContractHash) !== 'undefined') {
              results.push(Object.assign(log.args, { _legalContractHash: legalContractHash }));
            }
          }
          resolve(results);
        });
    });
};

export const retrieveLegalContractHashFromTransaction = async (
  web3: Web3,
  contractName: string,
  contractAddress: Address,
  functionName: string,
  txId: Hash): Promise<Hash> => {

  const truffleContract = await Utils.requireContract(contractName);

  const abi = truffleContract.abi.filter((entry: any) => entry.name === functionName)[0];

  abi.inputs.push({
    name: '_legalContractHash',
    type: 'bytes32',
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

  const contractHash = decodedData.params.filter((param: any) => param.name === '_legalContractHash');

  // return (referrerParam.length && referrerParam[0].value && (referrerParam[0].value !== '0x'))
  //   ? referrerParam[0].value : undefined;
  return (contractHash.length ? contractHash[0].value : undefined);
};

interface ILegalLockInfo extends Locking4ReputationLockEventResult {
  legalContractHash: Hash;
}
