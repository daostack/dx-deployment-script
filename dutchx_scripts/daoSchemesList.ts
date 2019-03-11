import {
  Address,
  DAO,
  DaoSchemeInfo,
  InitializeArcJs,
  LoggingService,
  LogLevel,
  Web3,
  WrapperService
} from '@daostack/arc.js';
import { promisify } from 'es6-promisify';

/**
 * List schemes in the given dao.
 * @param web3
 * @param networkName
 * @param avatar
 */
export const run = async (
  web3: Web3,
  networkName: string,
  avatar: Address,
  blockNum: string): Promise<void> => {

  if (!avatar) {
    return Promise.reject('avatar was not supplied');
  }

  // tslint:disable-next-line: no-bitwise
  LoggingService.logLevel = LogLevel.info | LogLevel.error;

  await InitializeArcJs();

  const dao: DAO = await DAO.at(avatar);

  const schemes = await dao.getSchemes(
    undefined,
    blockNum ? { fromBlock: blockNum } : undefined
  );

  console.log(`address                                    | contract name`);
  for (const scheme of schemes) {
    if (!scheme.wrapper) {
      await findNonDeployedArcScheme(scheme, web3);
    }
    console.log(`${scheme.address} | ${scheme.wrapper ? scheme.wrapper.name : 'unknown'}`);
  }

  return Promise.resolve();
};

const dutchXSchemes = new Set<string>([
  'Auction4Reputation',
  'ExternalLocking4Reputation',
  'LockingEth4Reputation',
  'LockingToken4Reputation',
]);

const findNonDeployedArcScheme = async (scheme: DaoSchemeInfo, web3: Web3): Promise<void> => {
  // tslint:disable-next-line: no-console
  // // console.time('findNonDeployedArcScheme');
  // see: https://solidity.readthedocs.io/en/latest/metadata.html
  const end = 'a165627a7a72305820';
  let code = await promisify((callback: any): any =>
    web3.eth.getCode(scheme.address, callback))() as string;

  code = code.substr(0, code.indexOf(end));

  for (const wrapperName in WrapperService.nonUniversalSchemeFactories) {
    if (WrapperService.nonUniversalSchemeFactories.hasOwnProperty(wrapperName)) {
      const factory = WrapperService.nonUniversalSchemeFactories[wrapperName];
      if (factory && dutchXSchemes.has(wrapperName)) {
        /**
         * look in Arc contracts
         */
        let found: boolean;
        let contract = null;
        // tslint:disable-next-line:no-empty
        try { contract = await factory.ensureSolidityContract(); } catch { }
        if (contract) {
          const deployedBinary = contract.deployedBinary.substr(0, contract.deployedBinary.indexOf(end));
          found = code === deployedBinary;
        }

        if (found) {
          const wrapper = await factory.at(scheme.address);
          scheme.wrapper = wrapper;
        }
      }
    }
  }
  // tslint:disable-next-line: no-console
  // // console.timeEnd('findNonDeployedArcScheme');
  return null;
};
