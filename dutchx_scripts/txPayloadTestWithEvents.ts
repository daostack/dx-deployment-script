import {
  Address,
  Hash,
  Locking4ReputationLockEventResult,
  Utils,
  Web3,
} from '@daostack/arc.js';
const abiDecoder = require('abi-decoder');

export const run = async (web3: Web3) => {

  const referrerAddress = '0x1bf4e7D549fD7Bf9c6BA3Be8BD2b9Af62F086220';

  await sendTransactionWithReferrer(
    web3,
    'LockingEth4Reputation',
    // contract address
    '0xdb56f2e9369e0d7bd191099125a3f6c370f8ed15',
    'lock',
    referrerAddress,
    // the usual function arguments
    [10000],
    // web3 config
    { value: web3.toWei('.1'), gas: 6100000 }
  );

  const referrersFetched = await retrieveReferrersFromEvent(
    web3,
    'LockingEth4Reputation',
    // contract address
    '0xdb56f2e9369e0d7bd191099125a3f6c370f8ed15',
    'lock'
  );

  if (!referrersFetched.length) {
    throw new Error('did not obtain referrer information');
  }

  for (const referrerInfo of referrersFetched) {
    // tslint:disable-next-line: max-line-length
    console.log(`referred by: ${referrerInfo.referrer} | locker: ${referrerInfo._locker} | amount: ${referrerInfo._amount} | period: ${referrerInfo._period}`);
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
  functionName: string): Promise<Array<IReferredLockInfo>> => {

  const truffleContract = await Utils.requireContract(contractName);
  const contract = await truffleContract.at(contractAddress);
  return new Promise<Array<IReferredLockInfo>>(
    (resolve: (result: Array<IReferredLockInfo>) => void, reject: (error: Error) => void): void => {

      contract.Lock({}, { fromBlock: 0 }).get(
        async (
          error: Error,
          logs: Array<any>): Promise<void> => {
          if (error) {
            return reject(error);
          }

          if (!Array.isArray(logs)) {
            logs = [logs];
          }

          const results = new Array<IReferredLockInfo>();

          for (const log of logs) {
            const txId = log.transactionHash;
            const referrer = await retrieveReferrerFromTransaction(
              web3,
              contractName,
              contractAddress,
              functionName,
              txId
            );
            if (referrer) {
              results.push(Object.assign(log.args, { referrer }));
            }
          }
          resolve(results);
        });
    });
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

  return (referrerParam.length && referrerParam[0].value && (referrerParam[0].value !== '0x'))
    ? referrerParam[0].value : undefined;
};

interface IReferredLockInfo extends Locking4ReputationLockEventResult {
  referrer: Address;
}
