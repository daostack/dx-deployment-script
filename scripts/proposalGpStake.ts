import {
  Address,
  InitializeArcJs,
  ConfigService,
  Web3,
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
 * @param amount 
 */
export const run = async (
  web3: Web3,
  networkName: string,
  votingMachineAddress: Address,
  proposalId: Address,
  vote: number,
  amount: number): Promise<void> => {

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

  amount = Number(amount);

  if (isNaN(amount)) {
    return Promise.reject("amount was not supplied or is not a number")
  }

  await InitializeArcJs({
    filter: {
      GenesisProtocol: true
    }
  });

  ConfigService.set("estimateGas", true);

  const votingMachine = await WrapperService.factories.GenesisProtocol.at(votingMachineAddress);

  console.log(`staking ${amount} for ${vote} on ${proposalId}...`);

  const result =
    await (await votingMachine.stake({ proposalId, vote, amount: amount.toString() }))
      .watchForTxMined();;

  console.log(`txHash: ${result.transactionHash}`);

  return Promise.resolve();
}
