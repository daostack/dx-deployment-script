import {
  InitializeArcJs,
  LoggingService,
  LogLevel,
  DAO,
  ConfigService,
  Web3,
  Address,
  DecodedLogEntryEvent
} from "@daostack/arc.js";
import { BigNumber } from '../node_modules/bignumber.js';

/**
 * List schemes in the given dao.
 * @param web3 
 * @param networkName 
 * @param avatar 
 */
export const run = async (web3: Web3, networkName: string, avatar: Address): Promise<void> => {

  if (!avatar) {
    return Promise.reject("avatar was not supplied")
  }

  LoggingService.logLevel = LogLevel.info | LogLevel.error;

  await InitializeArcJs();

  const dao: DAO = await DAO.at(avatar);

  const schemes = await dao.getSchemes();

  console.log(`address                                    | contract name`);
  schemes.forEach((scheme) => {
    console.log(`${scheme.address} | ${scheme.wrapper ? scheme.wrapper.name : "unknown"}`);
  });

  return Promise.resolve();
}
