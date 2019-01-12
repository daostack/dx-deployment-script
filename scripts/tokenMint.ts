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
 * Mint tokens.  'amount' will be converted to Wei.
 * If 'onBehalfOf' is not supplied, then will be set to account[0].
 * In the end, 'onBehalfOf' must be the owner of the token.
 * @param web3 
 * @param networkName 
 * @param tokenAddress 
 * @param amount 
 * @param to 
 * @param onBehalfOf 
 */
export const run = async (
  web3: Web3,
  networkName: string,
  tokenAddress: Address,
  amount: string,
  to: Address,
  onBehalfOf?: Address): Promise<void> => {

  if (!tokenAddress) {
    return Promise.reject("tokenAddress was not supplied")
  }

  if (!to) {
    return Promise.reject("to was not supplied")
  }

  if (!onBehalfOf) {
    onBehalfOf = await accounts[0];
  }

  const amountBn = new BigNumber(web3.toWei(amount));

  if (amountBn.lte(0)) {
    return Promise.reject("amount must be given and greater than zero")
  }

  console.log(`minting token ${tokenAddress}`);
  console.log(`${amount.toString()} tokens to ${to} on behalf of ${onBehalfOf}...`);

  // TODO:  use arc.js wrapper once available
  const token = (await Utils.requireContract("DAOToken")).at(tokenAddress);

  // const supply = await token.totalSupply();

  // if (supply.lt(amountBn)) {
  //   console.log(`not enough supply to mint: ${supply.toString(10)}`);
  // }

  const tx = await token.mint(to, amountBn, { from: onBehalfOf });

  const newBalance = web3.fromWei(await token.balanceOf(to));

  console.log(`new token balance of ${to}: ${newBalance}`);

  console.log(`txHash: ${tx.tx}`);

  return Promise.resolve();
}
