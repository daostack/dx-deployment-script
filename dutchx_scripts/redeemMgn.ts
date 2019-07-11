
import {
  Address, InitializeArcJs, Web3, WrapperService
} from '@daostack/arc.js';
import BigNumber from 'bignumber.js';

/**
 * display timestamp of the current block
 * @param web3
 * @param networkName
 * @param seconds
 */
export const run = async (
  web3: Web3,
  networkName: string,
  contractAddress: Address,
  contractName: string): Promise<void> => {

  await InitializeArcJs({
    filter: {
    },
  });

  const wrapper = await WrapperService.factories[contractName].at(contractAddress);

  if (!wrapper) {
    throw new Error('${contractName} instance not found');
  }

  for (const account of accounts) {
    try {
      console.log(`*** redeeming account ${account}`);

      if (contractName === 'Auction4Reputation') {
        const numAuctions = await wrapper.getNumberOfAuctions();
        let totalBid = new BigNumber(0);
        for (let auctionIndex = 0; auctionIndex < numAuctions; ++auctionIndex) {
          const amountBid = await wrapper.getBid(account, auctionIndex);
          totalBid = totalBid.add(amountBid);
          if (amountBid.gt(0)) {
            await wrapper.contract.redeem(account, auctionIndex);
            console.log(`  redeemed auction # ${auctionIndex + 1}`);
          }
        }

        // if (totalBid.eq(0)) {
        //   console.log(`  hasn't bid, nothing redeemed`);
        // }
      } else {
        const tx = await wrapper.redeem({
          lockerAddress: account,
        });

        if (!tx) {
          // console.log(`  hasn't locked, nothing redeemed`);
        } else {
          console.log(`  redeemed`);
        }
      }
    } catch (ex) {
      console.log(`  ${ex.message}`);
    }
  }

  return Promise.resolve();
};
