import {
  InitializeArcJs,
  LoggingService,
  LogLevel,
  DAO,
  Web3,
  Address,
  USchemeWrapperBase,
  WrapperService,
  IVotingMachineWrapper
} from "@daostack/arc.js";
import { BigNumber } from 'bignumber.js';

/**
 * Output info about an arc.js universal scheme given avatar and scheme name
 * @param web3 
 * @param networkName 
 * @param avatar
 * @param schemeName
 * @param votingMachineName - optionally supply name of a voting machine to see its parameters
 */
export const run = async (web3: Web3, networkName: string,
  avatar: Address,
  schemeName: string,
  votingMachineName?: string): Promise<void> => {

  if (!avatar) {
    return Promise.reject("avatar was not supplied")
  }

  if (!schemeName) {
    return Promise.reject("scheme name was not supplied")
  }

  LoggingService.logLevel = LogLevel.info | LogLevel.error;

  await InitializeArcJs();

  const dao: DAO = await DAO.at(avatar);

  const schemes = await dao.getSchemes(schemeName);

  if (schemes.length !== 1) {
    return Promise.reject(`number of schemes ${schemes.length} is not one`);
  }

  const schemeInfo = schemes[0];

  if (!schemeInfo.wrapper) {
    return Promise.reject(`requested scheme is not a scheme`);
  }

  const wrapper = schemeInfo.wrapper as USchemeWrapperBase;

  console.log(`address: ${wrapper.address}`);
  const params = await wrapper.getSchemeParameters(avatar);
  console.log(`parameters:`);
  console.dir(params);
  const perms = await wrapper.getSchemePermissions(avatar);
  console.log(`permissions: ${perms}`);

  if (votingMachineName) {
    const votingMachineWrapper = await WrapperService.factories[votingMachineName].at(params.votingMachineAddress) as IVotingMachineWrapper;
    const vmParams = await votingMachineWrapper.getParameters(params.voteParametersHash);
    console.log(`${votingMachineName} parameters:`);
    for (const propName in vmParams) {
      const prop = vmParams[propName];
      if ((prop.s !== undefined) && (prop.e !== undefined) && (prop.c !== undefined)) {
        vmParams[propName] = (<BigNumber>prop).toString();
      }
    }
    console.dir(vmParams);
  }
  return Promise.resolve();
}
