import {
  Address,
  InitializeArcJs,
  LoggingService,
  LogLevel,
  ConfigService,
  Web3,
  Utils
} from "@daostack/arc.js";
import { BigNumber } from 'bignumber.js';
import { promisify } from 'es6-promisify';

/**
 * Transfer ETH.  'amount' will be converted to Wei.
 * If 'from' is not supplied, then will be set to account[0].
 * 'from' must have a sufficient balance to cover the transfer,
 * and must be locked in the current node.
 * @param web3 
 * @param networkName 
 * @param amount 
 * @param to 
 * @param from
 */
export const run = async (
  web3: Web3,
  networkName: string,
  amount: string,
  to: Address,
  from?: Address): Promise<void> => {

  if (!to) {
    return Promise.reject("'to' was not supplied")
  }

  if (!from) {
    from = await accounts[0];
  }

  if (!from) {
    from = await accounts[0];
  }

  const amountBn = new BigNumber(web3.toWei(amount));

  if (amountBn.lte(0)) {
    return Promise.reject("amount must be given and greater than zero")
  }

  console.log(`transferring ${amount} ETH from ${from} to ${to}`);

  const txHash = await promisify((callback: any) => {
    web3.eth.sendTransaction({ from, to, value: amountBn }, callback);
  })();

  const newBalance = web3.fromWei(await promisify((callback: any) => {
    web3.eth.getBalance(to, callback);
  })());

  console.log(`new ETH balance of ${to}: ${newBalance}`);
  console.log(`txHash: ${txHash}`);

  return Promise.resolve();
}
