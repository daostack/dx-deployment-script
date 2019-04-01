import {
  Address,
  Auction4ReputationFactory,
  ConfigService,
  DAO,
  ExternalLocking4ReputationFactory,
  InitializeArcJs,
  LockingEth4ReputationFactory,
  LockingToken4ReputationFactory,
  LoggingService,
  LogLevel,
  Utils,
  Web3,
  WrapperService
} from '@daostack/arc.js';

import { Common } from '../scripts/common';
import { run as contractNew } from '../scripts/contractNew';
import { run as daoCreate } from '../scripts/daoCreate';
import { run as tokenMint } from '../scripts/tokenMint';

// tslint:disable: max-line-length

export const run = async (web3: Web3, networkName: string, configPath: string): Promise<void> => {

  if (!configPath) {
    throw new Error('configPath was not provided');
  }

  const config = require(configPath);

  await InitializeArcJs(); // note this is used by daoCreate as well

  ConfigService.set('estimateGas', config.estimateGas);

  let lockingEth4Reputation: ILock4ReputationContract;

  if (config.schemeParameters.LockingEth4Reputation.address) {
    lockingEth4Reputation = await LockingEth4ReputationFactory.at(config.schemeParameters.LockingEth4Reputation.address);
    console.log(`using LockingEth4Reputation at ${config.schemeParameters.LockingEth4Reputation.address}`);
  } else {
    const contract = await contractNew(web3, networkName,
      { name: 'LockingEth4Reputation' },
      config.schemeParameters.LockingEth4Reputation.gas,
      config.schemeParameters.LockingEth4Reputation.gasPrice);

    Common.setTruffleTimeout(contract, 0);

    lockingEth4Reputation = await LockingEth4ReputationFactory.at(contract.address);
  }

  let lockingToken4Reputation: ILock4ReputationContract;

  if (config.schemeParameters.LockingToken4Reputation.address) {
    lockingToken4Reputation = await LockingToken4ReputationFactory.at(config.schemeParameters.LockingToken4Reputation.address);
    console.log(`using LockingToken4Reputation at ${config.schemeParameters.LockingToken4Reputation.address}`);
  } else {
    const contract = await contractNew(web3, networkName,
      { name: 'LockingToken4Reputation' },
      config.schemeParameters.LockingToken4Reputation.gas,
      config.schemeParameters.LockingToken4Reputation.gasPrice);

    Common.setTruffleTimeout(contract, 0);

    lockingToken4Reputation = await LockingToken4ReputationFactory.at(contract.address);
  }

  let externalLocking4Reputation: ILock4ReputationContract;

  if (config.schemeParameters.ExternalLocking4Reputation.address) {
    externalLocking4Reputation = await ExternalLocking4ReputationFactory.at(config.schemeParameters.ExternalLocking4Reputation.address);
    console.log(`using ExternalLocking4Reputation at ${config.schemeParameters.ExternalLocking4Reputation.address}`);
  } else {
    const contract = await contractNew(web3, networkName,
      { name: 'ExternalLocking4Reputation' },
      config.schemeParameters.ExternalLocking4Reputation.gas,
      config.schemeParameters.ExternalLocking4Reputation.gasPrice);

    Common.setTruffleTimeout(contract, 0);

    externalLocking4Reputation = await ExternalLocking4ReputationFactory.at(contract.address);
  }

  let auction4Reputation: ILock4ReputationContract;

  if (config.schemeParameters.Auction4Reputation.address) {
    auction4Reputation = await Auction4ReputationFactory.at(config.schemeParameters.Auction4Reputation.address);
    console.log(`using Auction4Reputation at ${config.schemeParameters.Auction4Reputation.address}`);
  } else {
    const contract = await contractNew(web3, networkName,
      { name: 'Auction4Reputation' },
      config.schemeParameters.Auction4Reputation.gas,
      config.schemeParameters.Auction4Reputation.gasPrice);

    Common.setTruffleTimeout(contract, 0);

    auction4Reputation = await Auction4ReputationFactory.at(contract.address);
  }

  /**
   * Arc.js gets GEN addresses from the DAOstack migration repo
   */
  const genTokenAddress = await Utils.getGenTokenAddress();
  console.log(`genTokenAddress: ${genTokenAddress}`);

  /**
   * PriceOracle for LockingToken4Reputation
   */
  const priceOracleConfig = config.schemeParameters.LockingToken4Reputation.priceOracle;
  let priceOracleAddress: Address;

  if (priceOracleConfig.address === 'useMock') {

    const mockConfig = priceOracleConfig.mock;

    const priceOracleMock:
      { setTokenPrice: (address: Address, numerator: number, denominator: number) => Promise<void>, address: Address } =
      await contractNew(web3, networkName, { name: 'PriceOracleMock' },
        mockConfig.gas,
        mockConfig.gasPrice
      ) as any;

    priceOracleAddress = priceOracleMock.address;

    if (networkName !== 'Ganache') {
      await Common.sleep(4000);
    }

    for (const tokenSpec of mockConfig.tokens) {
      const address = tokenSpec.address === 'GEN' ? genTokenAddress : tokenSpec.address;
      if (!address) {
        console.warn(`warning: token address not found`);
      } else {
        priceOracleMock.setTokenPrice(address, tokenSpec.numerator, tokenSpec.denominator);
      }
    }
  } else {
    console.log(`using priceOracleAddress at ${priceOracleConfig.address}`);
    priceOracleAddress = priceOracleConfig.address;
  }

  /**
   * ExternalLocker (MGN) for ExternalLocking4Reputation
   */
  const externalLockerConfig = config.schemeParameters.ExternalLocking4Reputation.externalLocker;
  let externalLockerAddress: Address;

  if (externalLockerConfig.address === 'useMock') {

    const mockConfig = externalLockerConfig.mock;

    const externalLockerMock:
      { lock: (amount: string, from: Address) => Promise<void>, address: Address } =
      await contractNew(web3, networkName, { name: 'ExternalTokenLockerMock' },
        mockConfig.gas,
        mockConfig.gasPrice
      ) as any;

    externalLockerAddress = externalLockerMock.address;

    if (networkName !== 'Ganache') {
      await Common.sleep(4000);
    }

    for (const lockSpec of mockConfig.locks) {
      let address: Address;
      if (typeof lockSpec.account === 'number') {
        address = accounts[lockSpec.account];
      } else {
        address = lockSpec.account;
      }
      if (!address) {
        console.warn(`warning: account address not found`);
      } else {
        externalLockerMock.lock(web3.toWei(lockSpec.amount), address);
      }
    }
  } else {
    console.log(`using externalLockerAddress at ${externalLockerConfig.address}`);
    externalLockerAddress = externalLockerConfig.address;
  }

  /**
   * Create the DAO
   */
  const daoConfig = config.daoConfig;

  const gpAddress = Utils.getDeployedAddress('GenesisProtocol');

  const crWrapper = WrapperService.wrappers.ContributionReward;

  const crParamsHash = (await crWrapper.setParameters({
    voteParametersHash: '0x3fb8bf97a9a9ea15a37fd0ec72555a3b89c06cf19f92705138749e427312c294',
    votingMachineAddress: gpAddress,
  })).result;

  console.log(`ContributionReward:`);
  console.log(`  address: ${crWrapper.address}`);
  console.log(`  params hash: ${crParamsHash}`);

  const srWrapper = WrapperService.wrappers.SchemeRegistrar;

  const srParamsHash = (await srWrapper.setParameters({
    voteParametersHash: '0x89b69e45bb80e1f1250c5226ccc5873ea4d6edc5ec9277a14fa68c4ab1837cc9',
    votingMachineAddress: gpAddress,
  })).result;

  console.log(`SchemeRegistrar:`);
  console.log(`  address: ${srWrapper.address}`);
  console.log(`  params hash: ${srParamsHash}`);

  const gsWrapper = WrapperService.wrappers.GenericScheme;

  const gsParamsHash = (await gsWrapper.setParameters({
    contractToCall: '0x0',
    voteParametersHash: '0x1e25ee128c360531fceac94dae151b70f629a0728e40af1da05f3660d2324b48',
    votingMachineAddress: gpAddress,
  })).result;

  console.log(`GenericScheme:`);
  console.log(`  address: ${gsWrapper.address}`);
  console.log(`  params hash: ${gsParamsHash}`);

  daoConfig.schemes = [...(daoConfig.schemes || []), ...
    [
      {
        address: lockingEth4Reputation.address,
        name: 'LockingEth4Reputation',
      },
      {
        address: externalLocking4Reputation.address,
        name: 'ExternalLocking4Reputation',
      },
      {
        address: lockingToken4Reputation.address,
        name: 'LockingToken4Reputation',
      },
      {
        address: auction4Reputation.address,
        name: 'Auction4Reputation',
      },
      {
        address: crWrapper.address,
        parametersHash: crParamsHash,
        permissions: crWrapper.getDefaultPermissions(),
      },
      {
        address: srWrapper.address,
        parametersHash: srParamsHash,
        permissions: crWrapper.getDefaultPermissions(),
      },
      {
        address: gsWrapper.address,
        parametersHash: gsParamsHash,
        permissions: crWrapper.getDefaultPermissions(),
      },
    ]];

  // tslint:disable-next-line: no-bitwise
  LoggingService.logLevel = LogLevel.error | LogLevel.info;

  const dao = (await daoCreate(web3, networkName, daoConfig, 'true')) as DAO;

  /**********************
   !!!! Start and end dates should be such that they can be divided evenly by (NUM_AUCTIONS / 1000)
   **********************/
  const LOCK_PERIOD_START_DATE = new Date(config.lockingPeriodStartDate);
  const LOCKING_PERIOD_END_DATE = new Date(config.lockingPeriodEndDate);
  const LOCKING_PERIOD_START_DATE_MGN = new Date(config.lockingPeriodStartDateMgn);
  const LOCKING_PERIOD_END_DATE_MGN = new Date(config.lockingPeriodEndDateMgn);
  /**********************
   !!!! Should be a number of auctions such that the sum of auction rep comes out to exactly TOTAL_REP_REWARD * AUCTION_BIDDING_RATIO
   **********************/
  const NUM_AUCTIONS = config.schemeParameters.Auction4Reputation.numAuctions;
  /**********************
   !!!! Should be an amount that yields a whole number when multiplied by any of the ratios below
   **********************/
  const TOTAL_REP_REWARD = config.totalRepReward;
  /**********************
   !!!! This is a hack, just for this script, that computes the length of a auction
   period given the length of the globally-set contract periods.  We add a millisecond to the
   end date because the period is treated as *inclusive* of this.  (Assumes the enddate is given like
   2019-04-14T23:59:59.999+0200).
   **********************/
  const AUCTION_PERIOD = (((LOCKING_PERIOD_END_DATE.getTime() + 1) - LOCK_PERIOD_START_DATE.getTime()) / NUM_AUCTIONS) / 1000;
  const REDEEM_ENABLE_DATE = new Date(LOCKING_PERIOD_END_DATE.getTime() + 1);

  let schemeConfig = config.schemeParameters.LockingEth4Reputation;

  await lockingEth4Reputation.initialize(
    {
      avatarAddress: dao.avatar.address,
      lockingEndTime: LOCKING_PERIOD_END_DATE,
      lockingStartTime: LOCK_PERIOD_START_DATE,
      maxLockingPeriod: schemeConfig.maxLockingPeriod,
      redeemEnableTime: REDEEM_ENABLE_DATE,
      reputationReward: web3.toWei(TOTAL_REP_REWARD * schemeConfig.lockingRatio),
    }
  );

  schemeConfig = config.schemeParameters.ExternalLocking4Reputation;

  await externalLocking4Reputation.initialize(
    {
      avatarAddress: dao.avatar.address,
      externalLockingContract: externalLockerAddress,
      getBalanceFuncSignature: 'lockedTokenBalances(address)',
      lockingEndTime: LOCKING_PERIOD_END_DATE_MGN,
      lockingStartTime: LOCKING_PERIOD_START_DATE_MGN,
      redeemEnableTime: REDEEM_ENABLE_DATE,
      reputationReward: web3.toWei(TOTAL_REP_REWARD * schemeConfig.lockingRatio),
    }
  );

  schemeConfig = config.schemeParameters.LockingToken4Reputation;

  await lockingToken4Reputation.initialize(
    {
      avatarAddress: dao.avatar.address,
      lockingEndTime: LOCKING_PERIOD_END_DATE,
      lockingStartTime: LOCK_PERIOD_START_DATE,
      maxLockingPeriod: schemeConfig.maxLockingPeriod,
      priceOracleContract: priceOracleAddress,
      redeemEnableTime: REDEEM_ENABLE_DATE,
      reputationReward: web3.toWei(TOTAL_REP_REWARD * schemeConfig.lockingRatio),
    }
  );

  schemeConfig = config.schemeParameters.Auction4Reputation;

  await auction4Reputation.initialize(
    {
      auctionPeriod: AUCTION_PERIOD,
      auctionsStartTime: LOCK_PERIOD_START_DATE,
      avatarAddress: dao.avatar.address,
      numberOfAuctions: NUM_AUCTIONS,
      redeemEnableTime: REDEEM_ENABLE_DATE,
      reputationReward: web3.toWei((TOTAL_REP_REWARD * schemeConfig.lockingRatio) / NUM_AUCTIONS),
      tokenAddress: genTokenAddress,
      walletAddress: dao.avatar.address,
    }
  );

  if (networkName === 'Ganache') {
    await tokenMint(web3, networkName, genTokenAddress, '100', accounts[0]);
    await tokenMint(web3, networkName, genTokenAddress, '100', accounts[1]);
    await tokenMint(web3, networkName, genTokenAddress, '100', accounts[2]);
  }

  console.log(`lockingPeriodStartDate: ${LOCK_PERIOD_START_DATE.toString()}`);
  console.log(`lockingPeriodEndDate: ${LOCKING_PERIOD_END_DATE.toString()}`);

  return Promise.resolve();
};

interface ILock4ReputationContract { address: Address; initialize: (...params) => Promise<any>; }
