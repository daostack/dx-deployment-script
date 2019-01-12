import {
  InitializeArcJs,
  LoggingService,
  LogLevel,
  DAO,
  Web3,
  Utils
} from "@daostack/arc.js";
import { BigNumber } from '../node_modules/bignumber.js';

/**
 * list the names and addresses of all the DAOs created using the Arc DaoCreator contract in the packaged version of Arc.js.
 * Note that previous packages of Arc.js may have used the same version of DaoCreator.
 * @param web3 
 * @param networkName 
 */
export const run = async (web3: Web3, networkName: string): Promise<void> => {

  LoggingService.logLevel = LogLevel.info | LogLevel.error;

  await InitializeArcJs({ filter: { DaoCreator: true } });

  const daoAddresses = await DAO.getDaos();

  for (const address of daoAddresses) {
    const Avatar = await Utils.requireContract("Avatar");
    let avatar = await Avatar.at(address)
      .then((avatar: any) => avatar); // only way to get to catch

    // the need for web3.toUtf8 is going away in the next version of Arc
    console.log(`${await web3.toUtf8(await avatar.orgName())}: ${address}`);
  }

  return Promise.resolve();
}
