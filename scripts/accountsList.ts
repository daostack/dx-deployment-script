import {
  InitializeArcJs,
  LoggingService,
  LogLevel,
  Web3
} from "@daostack/arc.js";

/**
 * list all of the account addresses
 * @param web3 
 * @param networkName 
 */
export const run = async (web3: Web3, networkName: string): Promise<void> => {

  accounts.forEach((a) => {
    console.log(a);
  })

  return Promise.resolve();
}
