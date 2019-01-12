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

/**
 * Transfer tokens.  'amount' will be converted to Wei.
 * If 'from' is not supplied, then will be set to account[0].
 * 'from' must have a sufficient balance of tokens to cover the transfer,
 * and must be locked in the running node.
 * @param web3 
 * @param networkName 
 * @param tokenAddress 
 * @param amount 
 * @param to 
 * @param from
 */
export const run = async (
  web3: Web3,
  networkName: string,
  tokenAddress: Address,
  amount: string,
  to: Address,
  from?: Address): Promise<void> => {

  if (!tokenAddress) {
    return Promise.reject("tokenAddress was not supplied")
  }

  if (!to) {
    return Promise.reject("'to' was not supplied")
  }

  if (!from) {
    from = await accounts[0];
  }

  const amountBn = new BigNumber(web3.toWei(amount));

  if (amountBn.lte(0)) {
    return Promise.reject("amount must be given and greater than zero")
  }

  console.log(`transferring ${amount} tokens from ${from} to ${to}`);

  // TODO:  use arc.js wrapper once available
  const token = (await Utils.requireContract("StandardToken")).at(tokenAddress);
  const tx = await token.transfer(to, amountBn, { from });

  const newBalance = web3.fromWei(await token.balanceOf(to));

  console.log(`new token balance of ${to}: ${newBalance}`);

  console.log(`txHash: ${tx.tx}`);

  return Promise.resolve();
}
