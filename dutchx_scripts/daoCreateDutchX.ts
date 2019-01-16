import {
  Address,
  Auction4ReputationFactory,
  ConfigService,
  DAO,
  ExternalLocking4ReputationFactory,
  InitializeArcJs,
  LockingEth4ReputationFactory,
  LockingToken4ReputationFactory,
  Utils,
  Web3
} from "@daostack/arc.js";

import { run as contractNew } from "../scripts/contractNew";
import { run as daoCreate } from "../scripts/daoCreate";
import { run as tokenMint } from "../scripts/tokenMint";

// tslint:disable: max-line-length

export const run = async (web3: Web3, networkName: string, configPath: string): Promise<void> => {

  /**
   * configPath must be a full path
   */
  if (!configPath) {
    throw new Error('configPath was not provided');
  }

  const config = require(configPath);

  await InitializeArcJs({
    filter: {},
  });

  ConfigService.set("estimateGas", config.estimateGas);

  const lockingEth4Reputation =
    await LockingEth4ReputationFactory
      .at((await contractNew(web3, networkName, 
        { name: "LockingEth4Reputation" },
        config.schemeParameters.LockingEth4Reputation.gas,
        config.schemeParameters.LockingEth4Reputation.gasPrice) as Lock4ReputationContract).address);
  
  const lockingToken4Reputation =
    await LockingToken4ReputationFactory
      .at((await contractNew(web3, networkName, 
        { name: "LockingToken4Reputation" },
        config.schemeParameters.LockingToken4Reputation.gas,
        config.schemeParameters.LockingToken4Reputation.gasPrice) as Lock4ReputationContract).address);
  
  const externalLocking4Reputation =
    await ExternalLocking4ReputationFactory
      .at((await contractNew(web3, networkName, 
        { name: "ExternalLocking4Reputation" },
        config.schemeParameters.ExternalLocking4Reputation.gas,
        config.schemeParameters.ExternalLocking4Reputation.gasPrice) as Lock4ReputationContract).address);
  
  const auction4Reputation =
    await Auction4ReputationFactory
      .at((await contractNew(web3, networkName, 
        { name: "Auction4Reputation" },
        config.schemeParameters.Auction4Reputation.gas,
        config.schemeParameters.Auction4Reputation.gasPrice) as Lock4ReputationContract).address);

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

  if (priceOracleConfig.address === "useMock") {
    
    const mockConfig = priceOracleConfig.mock;

    const priceOracleMock:
      { setTokenPrice: (address: Address, numerator: number, denominator: number) => Promise<void>, address: Address } =
        await contractNew(web3, networkName, { name: "PriceOracleMock" },
          mockConfig.gas,
          mockConfig.gasPrice
        ) as any;

    priceOracleAddress = priceOracleMock.address;

    for (const tokenSpec of mockConfig.tokens) {
      const address = tokenSpec.address === "GEN" ? genTokenAddress : tokenSpec.address;
      await priceOracleMock.setTokenPrice(address, tokenSpec.numerator, tokenSpec.denominator);
    }
  } else{
    priceOracleAddress = priceOracleConfig.address;
  }

  /**
   * ExternalLocker (MGN) for ExternalLocking4Reputation
   */
  const externalLockerConfig = config.schemeParameters.ExternalLocking4Reputation.externalLocker;
  let externalLockerAddress: Address;

  if (externalLockerConfig.address === "useMock") {
    
    const mockConfig = externalLockerConfig.mock;

    const externalLockerMock:
      { lock: (amount: string, options: { from: Address }) => Promise<void>, address: Address } =
        await contractNew(web3, networkName, { name: "ExternalTokenLockerMock" },
          mockConfig.gas,
          mockConfig.gasPrice
        ) as any;

    externalLockerAddress = externalLockerMock.address;

    for (const lockSpec of mockConfig.locks) {
      let address:Address;
      if (!lockSpec.account.startsWith("0x")) {
        address = accounts[lockSpec.account]
      } else {
        address = lockSpec.account;
      }
      await externalLockerMock.lock(lockSpec.amount, { from: address});
    }
  } else{
    externalLockerAddress = externalLockerConfig.address;
  }

  /**
   * Create the DAO
   */
  const daoConfig = config.daoConfig;
  
  daoConfig.schemes = [...(daoConfig.schemes || []), ...
    [
      {
        address: lockingEth4Reputation.address,
        name: "LockingEth4Reputation",
      },
      {
        address: externalLocking4Reputation.address,
        name: "ExternalLocking4Reputation",
      },
      {
        address: lockingToken4Reputation.address,
        name: "LockingToken4Reputation",
      },
      {
        address: auction4Reputation.address,
        name: "Auction4Reputation",
      },
    ]];

  const dao = (await daoCreate(web3, networkName, daoConfig, "true")) as DAO;

  /**********************
   !!!! Start and end dates should be such that they can be divided evenly by (NUM_AUCTIONS / 1000)
   **********************/
  const LOCK_PERIOD_START_DATE          = new Date(config.lockingPeriodStartDate);
  const LOCKING_PERIOD_END_DATE         = new Date(config.lockingPeriodEndDate);
  const LOCKING_PERIOD_START_DATE_MGN   = new Date(config.lockingPeriodStartDateMgn);
  const LOCKING_PERIOD_END_DATE_MGN     = new Date(config.lockingPeriodEndDateMgn);
  /**********************
   !!!! Should be a number of auctions such that the sum of auction rep comes out to exactly TOTAL_REP_REWARD * AUCTION_BIDDING_RATIO
   **********************/
  const NUM_AUCTIONS = config.schemeParameters.Auction4Reputation.numAuctions;
  /**********************
   !!!! Should be an amount that yields a whole number when multiplied by any of the ratios below
   **********************/
  const TOTAL_REP_REWARD = config.totalRepReward;
  const AUCTION_PERIOD = ((LOCKING_PERIOD_END_DATE.getTime() - LOCK_PERIOD_START_DATE.getTime()) / NUM_AUCTIONS) / 1000;
  const REDEEM_ENABLE_DATE = LOCKING_PERIOD_END_DATE;

  let schemeConfig = config.schemeParameters["LockingEth4Reputation"];

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

  schemeConfig = config.schemeParameters["ExternalLocking4Reputation"];

  await externalLocking4Reputation.initialize(
    {
      avatarAddress: dao.avatar.address,
      externalLockingContract: externalLockerAddress,
      getBalanceFuncSignature: "lockedTokenBalances(address)",
      lockingEndTime: LOCKING_PERIOD_END_DATE_MGN,
      lockingStartTime: LOCKING_PERIOD_START_DATE_MGN,
      redeemEnableTime: REDEEM_ENABLE_DATE,
      reputationReward: web3.toWei(TOTAL_REP_REWARD * schemeConfig.lockingRatio),
    }
  );

  schemeConfig = config.schemeParameters["LockingToken4Reputation"];

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

  schemeConfig = config.schemeParameters["Auction4Reputation"];

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

  if (networkName === "Ganache") {
    await tokenMint(web3, networkName, genTokenAddress, "100", accounts[0]);
    await tokenMint(web3, networkName, genTokenAddress, "100", accounts[1]);
    await tokenMint(web3, networkName, genTokenAddress, "100", accounts[2]);
  }

  console.log(`lockingPeriodStartDate: ${LOCK_PERIOD_START_DATE.toString()}`);
  console.log(`lockingPeriodEndDate: ${LOCKING_PERIOD_END_DATE.toString()}`);

  return Promise.resolve();
};

interface Lock4ReputationContract { address: Address; initialize: (...params) => Promise<any>; }
