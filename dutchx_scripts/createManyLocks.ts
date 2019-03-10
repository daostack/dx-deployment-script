import {
  Address,
  ConfigService,
  InitializeArcJs,
  LockingEth4ReputationFactory,
  Web3
} from '@daostack/arc.js';
import BigNumber from 'bignumber.js';
import { Common } from '../scripts/common';
const ora = require('ora');

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

  console.log(`creating ${numLocks} locks`);

  const spinner = ora();

  spinner.start();

  for (let n = 0; n < numLocks; ++n) {

    spinner.text = `${n + 1}...`;

    try {
      await lockingEth4Reputation.lock({
        amount: web3.toWei('.0000001'),
        lockerAddress: accounts[0],
        period: 10, // ten second period
      });
    } catch {
      --n; // retry
    }

    await Common.sleep(3000); // seems to need this sometimes with Rinkeby (?)
  }

  spinner.succeed(`created ${numLocks} locks`);

  return Promise.resolve();
};
