import {
  ConfigService,
  InitializeArcJs,
  LockingEth4ReputationFactory,
  Web3,
  Address
} from '@daostack/arc.js';
import BigNumber from 'bignumber.js';

export const run = async (
  web3: Web3,
  networkName: string,
  numLocks: string | number,
  contractAddress: Address): Promise<void> => {

  // tslint:disable: max-line-length

  await InitializeArcJs({
    filter: {},
  });

  ConfigService.set('estimateGas', true);

  if (!contractAddress) {
    contractAddress = '0xdb56f2e9369e0d7bd191099125a3f6c370f8ed15';
  }

  if (!numLocks) {
    numLocks = '1';
  }

  numLocks = Number(numLocks);

  const lockingEth4Reputation =
    await LockingEth4ReputationFactory.at(contractAddress);

  console.log(`creating ${numLocks} locks...`);

  for (let n = 0; n < numLocks; ++n) {

    await lockingEth4Reputation.lock({
      amount: web3.toWei('.0000001'),
      lockerAddress: accounts[0],
      period: 10000, // ten second period
    });
  }

  console.log(`created ${numLocks} locks`);

  return Promise.resolve();
};
