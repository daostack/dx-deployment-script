import {
  Web3
} from '@daostack/arc.js';
import { promisify } from 'es6-promisify';
import { BlockWithoutTransactionData } from 'web3';

/**
 * display timestamp of the current block
 * @param web3
 * @param networkName
 * @param seconds
 */
export const run = async (
  web3: Web3,
  networkName: string): Promise<void> => {

  const block = await promisify((callback): any =>
    web3.eth.getBlock('latest', callback))() as BlockWithoutTransactionData;
  const timestamp = block.timestamp;
  const date = new Date(timestamp * 1000);

  console.log(`timestamp of latest block (seconds): ${timestamp}`);
  console.log(`date of latest block: ${date}`);

  return Promise.resolve();
};
