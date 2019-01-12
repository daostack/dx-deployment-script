import {
  InitializeArcJs,
  LoggingService,
  LogLevel,
  Web3,
  Address,
  WrapperService,
  RedeemEventResult,
  DecodedLogEntryEvent,
  NewContributionProposalEventResult,
  Hash,
  GpStakeEventResult,
  VoteProposalEventResult,
  ContributionProposal,
  BinaryVoteResult,
  GpRedeemEventResult,
} from "@daostack/arc.js";
import { BigNumber } from 'bignumber.js';

let proposals: Array<NewContributionProposalEventResult>;
let executedProposals: Array<ContributionProposal>;

/**
 * Output information about Dao participant activity.  Currently only related to ContributionReward.
 * ! Heads up:  These computations have not yet been vetted for accuracy !
 * @param web3 
 * @param networkName 
 * @param avatar 
 */
export const run = async (web3: Web3, networkName: string, avatar: Address): Promise<void> => {

  if (!avatar) {
    return Promise.reject("avatar was not supplied")
  }

  LoggingService.logLevel = LogLevel.info | LogLevel.error;

  await InitializeArcJs({
    filter: {
      ContributionReward: true,
      GenesisProtocol: true
    }
  });

  await reportContributionReward(avatar);
  await reportGenesisProtocol(avatar);

  return Promise.resolve();
}

const reportGenesisProtocol = async (avatar: Address) => {

  const genesisProtocol = WrapperService.wrappers.GenesisProtocol;

  console.log(`GenesisProtocol`);

  const proposalIds = new Set<Hash>(
    proposals.map((p: NewContributionProposalEventResult) => p._proposalId));

  // const gpProposalsById = new Map<Hash, GenesisProtocolProposal>();
  // for (const proposalId of proposalIds {
  //   const proposal = await genesisProtocol.getProposal(proposalId);
  //   gpProposalsById.set(proposalId, proposal);
  // }

  const winningVotes = new Map<Hash, number>();
  executedProposals.forEach((p) => {
    winningVotes.set(p.proposalId, (<any>p).winningVote)
  });

  // const gpExecutedProposalFetcher = genesisProtocol.GPExecuteProposal(
  //   { _avatar: avatar },
  //   { fromBlock: 0 }
  // );

  // const gpExecutedProposals = (await gpExecutedProposalFetcher.get())
  //   .map((p: DecodedLogEntryEvent<GPExecuteProposalEventResult>) => p.args);

  // const gpExecutionStateByProposalId = new Map<Hash, ExecutionState>();
  // for (const executedProposal of gpExecutedProposals) {
  //   gpExecutionStateByProposalId.set(executedProposal._proposalId, executedProposal._executionState.toNumber());
  // }

  const votesFetcher = genesisProtocol.VoteProposal(
    { _avatar: avatar },
    { fromBlock: 0 }
  );
  /**
   * only count votes on the given list of proposals (don't count votes from contracts we aren't counting)
   */
  const votes = (await votesFetcher.get())
    .filter((vote: DecodedLogEntryEvent<VoteProposalEventResult>) => proposalIds.has(vote.args._proposalId));

  console.log(`  votes: ${votes.length}`);

  if (votes.length) {

    const tokensRedeemedFetcher = genesisProtocol.Redeem(
      { _avatar: avatar },
      { fromBlock: 0 }
    );
    /**
     * only count votes on the given list of proposals
     */
    const tokenRedemptions = (await tokensRedeemedFetcher.get())
      .filter((vote: DecodedLogEntryEvent<GpRedeemEventResult>) => proposalIds.has(vote.args._proposalId));

    const totalTokensRedeemed = tokenRedemptions
      .map((r: DecodedLogEntryEvent<GpRedeemEventResult>) => r.args._amount)
      .reduce((prev: BigNumber, current: BigNumber) => {
        return prev.add(current)
      })

    console.log(`    GEN redeemed: ${web3.fromWei(totalTokensRedeemed).toString(10)}`);

    const reputationRedeemedFetcher = genesisProtocol.RedeemReputation(
      { _avatar: avatar },
      { fromBlock: 0 }
    );
    /**
     * only count votes on the given list of proposals
     */
    const reputationRedemptions = (await reputationRedeemedFetcher.get())
      .filter((vote: DecodedLogEntryEvent<GpRedeemEventResult>) => proposalIds.has(vote.args._proposalId));

    const reputationRedeemed = reputationRedemptions
      .map((r: DecodedLogEntryEvent<GpRedeemEventResult>) => r.args._amount)
      .reduce((prev: BigNumber, current: BigNumber) => {
        return prev.add(current)
      })

    console.log(`    reputation redeemed: ${web3.fromWei(reputationRedeemed).toString(10)}`);

    /**
     * can't do this calculation:  no way to know whether a vote occured during the preboosted period
     */
    //   let lostVoterRep = new BigNumber(0);

    //   for (const vote of votes) {
    //     /**
    //      * look only at losing votes on executed proposals
    //      */
    //     if (winningVotes.has(vote.args._proposalId) &&
    //       // BigNumber cast is due to bug in arc.js type definition. See PR https://github.com/daostack/arc.js/pull/355
    //       (winningVotes.get(vote.args._proposalId) !== (<BigNumber>(<any>vote.args._vote)).toNumber())) {

    //       if (!gpExecutionStateByProposalId.has(vote.args._proposalId)) {
    //         throw new Error(`proposal not found among execution state events`);
    //       }

    //       const executionState = gpExecutionStateByProposalId.get(vote.args._proposalId);
    //       /**
    //        * rep is only lost when you vote during preboosted
    //        * TODO:  check outcome of:  https://github.com/daostack/infra/issues/6
    //        */
    //       if ((executionState === ExecutionState.BoostedBarCrossed) ||
    //         (executionState === ExecutionState.BoostedTimeOut)) {

    //         lostVoterRep = lostVoterRep.add(vote.args._reputation);
    //       }
    //     }
    //   }
    //   console.log(`    lost reputation: ${web3.fromWei(lostVoterRep).toString(10)}`);
  }

  const stakesFetcher = genesisProtocol.Stake(
    { _avatar: avatar },
    { fromBlock: 0 }
  );
  /**
   * only count votes on the given list of proposals (don't count votes from contracts we aren't counting)
   */
  const stakes = (await stakesFetcher.get())
    .filter((stake: DecodedLogEntryEvent<GpStakeEventResult>) => proposalIds.has(stake.args._proposalId));

  console.log(`  stakes:`);
  console.log(`    count: ${stakes.length}`);

  if (stakes.length) {
    const totalStaked = stakes
      .map((r: DecodedLogEntryEvent<GpStakeEventResult>) => r.args._amount)
      .reduce((prev: BigNumber, current: BigNumber) => {
        return prev.add(current)
      })

    console.log(`    staked (GEN): ${web3.fromWei(totalStaked).toString(10)}`);


    let lostStaked = new BigNumber(0);

    for (const stake of stakes) {
      /**
       * look only at executed proposals here
       */
      if (winningVotes.has(stake.args._proposalId)
        // BigNumber cast is due to bug in arc.js type definition. See PR https://github.com/daostack/arc.js/pull/355
        && (winningVotes.get(stake.args._proposalId) !== (<BigNumber>(<any>stake.args._vote)).toNumber())) {
        lostStaked = lostStaked.add(stake.args._amount);
      }
    }
    console.log(`    lost stakes (GEN): ${web3.fromWei(lostStaked).toString(10)}`);
  }

  const bountyFetcher = genesisProtocol.RedeemDaoBounty(
    { _avatar: avatar },
    { fromBlock: 0 }
  );
  /**
   * only count stakes on the given list of proposals
   */
  const bounties = (await bountyFetcher.get())
    .filter((stake: DecodedLogEntryEvent<GpRedeemEventResult>) => proposalIds.has(stake.args._proposalId));

  console.log(`  bounties: ${bounties.length}`);

  if (bounties.length) {
    const totalBounties = bounties
      .map((r: DecodedLogEntryEvent<GpRedeemEventResult>) => r.args._amount)
      .reduce((prev: BigNumber, current: BigNumber) => {
        return prev.add(current)
      })

    console.log(`    GEN bounty redeemed: ${web3.fromWei(totalBounties).toString(10)}`);
  }
}

const reportContributionReward = async (avatar: Address): Promise<void> => {

  const contributionReward = WrapperService.wrappers.ContributionReward;
  const genesisProtocol = WrapperService.wrappers.GenesisProtocol;

  const proposalsFetcher = contributionReward.NewContributionProposal(
    { _avatar: avatar },
    { fromBlock: 0 }
  );

  proposals = (await proposalsFetcher.get())
    .map((p: DecodedLogEntryEvent<NewContributionProposalEventResult>) => p.args);

  console.log(`ContributionReward`);
  console.log(`  proposals: ${proposals.length}`);


  let totalRepBudget = new BigNumber(0);
  let totalEthBudget = new BigNumber(0);

  for (const proposal of proposals) {
    totalRepBudget = totalRepBudget.add(proposal._reputationChange);
    totalEthBudget = totalEthBudget.add(proposal._rewards[1]);
  }

  console.log(`  proposed rewards:`);

  console.log(`    total proposed net reputation change: ${web3.fromWei(totalRepBudget).toString(10)}`);
  console.log(`    total proposed eth rewards: ${web3.fromWei(totalEthBudget).toString(10)}`);

  const executedProposalsFetcher = contributionReward.getExecutedProposals(avatar)({}, { fromBlock: 0 });

  executedProposals = await executedProposalsFetcher.get();

  let totalRepAwarded = new BigNumber(0);
  let totalEthAwarded = new BigNumber(0);

  for (const proposal of executedProposals) {
    const winningVote = await genesisProtocol.getWinningVote({ proposalId: proposal.proposalId });
    (<any>proposal).winningVote = winningVote;
    if (winningVote === BinaryVoteResult.Yes) {
      totalRepAwarded = totalRepAwarded.add(proposal.reputationChange);
      totalEthAwarded = totalEthAwarded.add(proposal.ethReward);
    }
  }

  console.log(`    total winning net reputation change: ${web3.fromWei(totalRepAwarded).toString(10)}`);
  console.log(`    total winning eth rewards: ${web3.fromWei(totalEthAwarded).toString(10)}`);

  console.log(`  executed proposals: ${executedProposals.length}`);

  if (executedProposals.length) {

    const winningProposals = new Array<ContributionProposal>();

    for (const proposal of executedProposals) {
      const winningVote = (<any>proposal).winningVote;
      if (winningVote === BinaryVoteResult.Yes) {
        winningProposals.push(proposal);
      }
    }

    console.log(`  winning proposals: ${winningProposals.length}`);

    console.log(`  redemptions:`);

    const reputationRedemptionsFetcher = contributionReward.RedeemReputation({ _avatar: avatar }, { fromBlock: 0 });

    const reputationRedemptions = await reputationRedemptionsFetcher.get();

    // if (reputationRedemptions.length) 
    {
      console.log(`    reputation`);
      console.log(`      count: ${reputationRedemptions.length}`);
    }


    if (reputationRedemptions.length) {
      const netReputationRedeemed = reputationRedemptions
        .map((r: DecodedLogEntryEvent<RedeemEventResult>) => r.args._amount)
        .reduce((prev: BigNumber, current: BigNumber) => {
          return prev.add(current)
        })

      console.log(`      net amount: ${web3.fromWei(netReputationRedeemed).toString(10)}`);
    }


    const etherRedemptionsFetcher = contributionReward.RedeemEther({ _avatar: avatar }, { fromBlock: 0 });

    const etherRedemptions = await etherRedemptionsFetcher.get();

    // if (etherRedemptions.length) 
    {
      console.log(`    eth:`);
      console.log(`      count: ${etherRedemptions.length}`);
    }

    if (etherRedemptions.length) {
      const totalEtherRedeemed = etherRedemptions
        .map((r: DecodedLogEntryEvent<RedeemEventResult>) => r.args._amount)
        .reduce((prev: BigNumber, current: BigNumber) => {
          return prev.add(current)
        })

      console.log(`      amount: ${web3.fromWei(totalEtherRedeemed).toString(10)}`);
    }

    const nativeTokenRedemptionsFetcher = contributionReward.RedeemNativeToken({ _avatar: avatar }, { fromBlock: 0 });

    const nativeTokenRedemptions = await nativeTokenRedemptionsFetcher.get();

    // if (nativeTokenRedemptions.length) 
    {
      console.log(`    native token:`);
      console.log(`      count: ${nativeTokenRedemptions.length}`);
    }

    if (nativeTokenRedemptions.length) {
      const totalNativeTokensRedeemed = nativeTokenRedemptions
        .map((r: DecodedLogEntryEvent<RedeemEventResult>) => r.args._amount)
        .reduce((prev: BigNumber, current: BigNumber) => {
          return prev.add(current)
        })

      console.log(`      amount: ${web3.fromWei(totalNativeTokensRedeemed).toString(10)}`);
    }

    const externalTokenRedemptionsFetcher = contributionReward.RedeemExternalToken({ _avatar: avatar }, { fromBlock: 0 });

    const externalTokenRedemptions = await externalTokenRedemptionsFetcher.get();

    // if (externalTokenRedemptions.length) 
    {
      console.log(`    external token`);
      console.log(`      count: ${externalTokenRedemptions.length}`);
    }

    if (externalTokenRedemptions.length) {
      const totalExternalTokensRedeemed = externalTokenRedemptions
        .map((r: DecodedLogEntryEvent<RedeemEventResult>) => r.args._amount)
        .reduce((prev: BigNumber, current: BigNumber) => {
          return prev.add(current)
        })

      console.log(`      amount: ${web3.fromWei(totalExternalTokensRedeemed).toString(10)}`);
    }
  }
}
