
import {
  Address, Erc20Factory, Erc20Wrapper, InitializeArcJs, Web3
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
  tokenAddress: Address,
  spender: Address,
  amount?: string,
  owner?: Address): Promise<void> => {

  await InitializeArcJs({
    filter: {
    },
  });

  const wrapper = (await Erc20Factory.at(tokenAddress)) as Erc20Wrapper;

  if (!wrapper) {
    throw new Error('${tokenAddress} token instance not found');
  }

  owner = owner ? owner : accounts[0];
  amount = amount ? web3.toWei(amount) : '0';

  console.log(`current allowance: ${web3.fromWei(await wrapper.getAllowance({
    owner,
    spender,
  })).toNumber()}`);

  // arc.js wrapper doesn't allow setting to zero
  await wrapper.contract.approve(spender, amount, { from: owner });

  console.log(`new allowance: ${web3.fromWei(await wrapper.getAllowance({
    owner,
    spender,
  })).toNumber()}`);

  return Promise.resolve();
};
