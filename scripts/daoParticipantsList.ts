import {
  InitializeArcJs,
  LoggingService,
  LogLevel,
  DAO,
  Web3,
  Address,
  Participant
} from "@daostack/arc.js";
import { BigNumber } from '../node_modules/bignumber.js';

/**
 * List participants (as measured by reputation) in the given dao, sorted in descending order of reputation,
 * including the total amount of reputation, the amount per founder and their percentage of the total.
 * @param web3 
 * @param networkName 
 * @param avatar 
 */
export const run = async (web3: Web3, networkName: string, avatar: Address): Promise<void> => {

  if (!avatar) {
    return Promise.reject("avatar was not supplied")
  }

  LoggingService.logLevel = LogLevel.info | LogLevel.error;

  await InitializeArcJs({ filter: {} });

  const participants = await getParticipants(avatar, web3);

  participants.sort((a: ParticipantWithPerc, b: ParticipantWithPerc): number => {
    return (b.reputation.sub(a.reputation)).toNumber();
  });

  console.log(`address                                    | reputation\t|\tpercent of total`);
  participants.forEach((p) => {
    console.log(`${p.address} | ${web3.fromWei(p.reputation).toString(10)}\t|\t${p.percentageOfTotal.toFixed(2)}`);
  });

  return Promise.resolve();
}

interface ParticipantWithPerc extends Participant {
  percentageOfTotal?: number;
}

const getParticipants = async (avatar: Address, web3: Web3): Promise<Array<ParticipantWithPerc>> => {

  const dao: DAO = await DAO.at(avatar);

  let participants = await dao.getParticipants({ returnReputations: true });

  const totalReputation = participants
    .map((p: ParticipantWithPerc) => p.reputation)
    .reduce((prev: BigNumber, current: BigNumber) => prev.add(current));

  console.log(`total reputation: ${web3.fromWei(totalReputation)}`);

  participants.forEach((p: ParticipantWithPerc) => { p.percentageOfTotal = p.reputation.div(totalReputation).toNumber() * 100; })

  return participants;
}
