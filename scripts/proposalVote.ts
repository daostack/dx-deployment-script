import {
  Address,
  InitializeArcJs,
  LoggingService,
  LogLevel,
  ConfigService,
  Web3,
  Utils,
  WrapperService
} from "@daostack/arc.js";
import { BigNumber } from 'bignumber.js';

/**
 * Vote on a proposal using the voting machine from the given scheme contract.
 * @param web3 
 * @param networkName 
 * @param votingMachineAddress 
 * @param proposalId 
 * @param vote 
 */
export const run = async (
  web3: Web3,
  networkName: string,
  votingMachineAddress: Address,
  proposalId: Address,
  vote: number): Promise<void> => {

  if (!votingMachineAddress) {
    return Promise.reject("votingMachineAddress was not supplied")
  }

  if (!proposalId) {
    return Promise.reject("proposalId was not supplied")
  }

  vote = Number(vote);

  if (!Number.isInteger(vote)) {
    return Promise.reject("vote was not supplied or is not an integer")
  }

  await InitializeArcJs({
    filter: {
    }
  });

  ConfigService.set("estimateGas", true);

  const votingMachine = await WrapperService.factories.IntVoteInterface.at(votingMachineAddress);

  console.log(`voting ${vote} on ${proposalId}...`);

  const result = await (await votingMachine.vote({ proposalId, vote })).watchForTxMined();

  console.log(`txHash: ${result.transactionHash}`);

  return Promise.resolve();
}
