import {
  Address,
  Auction4ReputationFactory,
  ConfigService,
  DAO,
  ExternalLocking4ReputationFactory,
  InitializeArcJs,
  LockingEth4ReputationFactory,
  LockingToken4ReputationFactory,
  // FixedReputationAllocationFactory,
  Utils,
  Web3
} from "@daostack/arc.js";

import { run as contractNew } from "../scripts/contractNew";
import { run as daoCreate } from "../scripts/daoCreate";
import { run as tokenMint } from "../scripts/tokenMint";

export const run = async (web3: Web3, networkName: string): Promise<void> => {

// tslint:disable: max-line-length

  await InitializeArcJs({
    filter: {},
  });

  ConfigService.set("estimateGas", true);

  const daoSchema = require(`../../dutchx_scripts/specsNewDaos/dutchX.${networkName.toLowerCase()}.json`);

  const lockingEth4Reputation =
    await LockingEth4ReputationFactory.at((await contractNew(web3, networkName, { name: "LockingEth4Reputation" }, "max", "50000000000") as Lock4ReputationContract).address);
  const lockingToken4Reputation =
    await LockingToken4ReputationFactory.at((await contractNew(web3, networkName, { name: "LockingToken4Reputation" }, "max", "50000000000") as Lock4ReputationContract).address);
  const externalLocking4Reputation =
    await ExternalLocking4ReputationFactory.at((await contractNew(web3, networkName, { name: "ExternalLocking4Reputation" }, "max", "50000000000") as Lock4ReputationContract).address);
  const auction4Reputation =
    await Auction4ReputationFactory.at((await contractNew(web3, networkName, { name: "Auction4Reputation" }, "max", "50000000000") as Lock4ReputationContract).address);

  let externalTokenLockerAddress: Address;
  let priceOracleInterfaceAddress: Address;
  let priceOracleInterfaceMock: any;
  let gnoTokenAddress: Address;
  let externalTokenLockerMock: { lock: (amount: string, options: { from: Address }) => Promise<void>, address: Address };
  const genTokenAddress = await Utils.getGenTokenAddress();

  switch (networkName) {
    case "Ganache":
      gnoTokenAddress = genTokenAddress;

      priceOracleInterfaceMock =
        await contractNew(web3, networkName, { name: "PriceOracleMock" }, "max", "50000000000") as any;

      priceOracleInterfaceAddress = priceOracleInterfaceMock.address;

      await priceOracleInterfaceMock.setTokenPrice(gnoTokenAddress, 380407, 200000000);

      externalTokenLockerMock =
        await contractNew(web3, networkName, { name: "ExternalTokenLockerMock" }, "max", "50000000000") as any;

      externalTokenLockerAddress = externalTokenLockerMock.address;

      await externalTokenLockerMock.lock("100000000000000000000", { from: accounts[0] });
      await externalTokenLockerMock.lock("100000000000000000000", { from: accounts[1] });
      await externalTokenLockerMock.lock("100000000000000000000", { from: accounts[2] });

      break;
    case "Kovan":
      externalTokenLockerAddress = "0x4edc383adea781762b74e7082c03f423523e61bb";
      gnoTokenAddress = "0x6018bf616ec9db02f90c8c8529ddadc10a5c29dc";

      priceOracleInterfaceMock =
        await contractNew(web3, networkName, { name: "PriceOracleMock" }, "max", "50000000000") as any;

      priceOracleInterfaceAddress = priceOracleInterfaceMock.address;

      await priceOracleInterfaceMock.setTokenPrice(gnoTokenAddress, 380407, 200000000);
      await priceOracleInterfaceMock.setTokenPrice("0x4edc383adea781762b74e7082c03f423523e61bb", 380407, 200000000);
      await priceOracleInterfaceMock.setTokenPrice("0x543Ff227F64Aa17eA132Bf9886cAb5DB55DCAddf", 380407, 200000000);

      externalTokenLockerMock =
        await contractNew(web3, networkName, { name: "ExternalTokenLockerMock" }, "max", "50000000000") as any;

      externalTokenLockerAddress = externalTokenLockerMock.address;

      await externalTokenLockerMock.lock("100000000000000000000", { from: accounts[0] });

      break;
    case "Rinkeby":
      externalTokenLockerAddress = "0x4edc383adea781762b74e7082c03f423523e61bb";
      gnoTokenAddress = "0xd0dab4e640d95e9e8a47545598c33e31bdb53c7c";
      /**
       * This is just one they recently deployed.  It changes with each new DAO.  getPrice currently returns all zeros, need to find a better one
       */
      priceOracleInterfaceAddress = "0x1C54f6146bA3656739A5c0781Cc054FA0C3951C1";
      // priceOracleInterfaceMock =
      //   await contractNew(web3, networkName, { name: "PriceOracleMock" }, "max", "50000000000") as any;

      // priceOracleInterfaceAddress = priceOracleInterfaceMock.address;

      // await priceOracleInterfaceMock.setTokenPrice("0xc778417e063141139fce010982780140aa0cd5ab", 380407, 200000000);
      // await priceOracleInterfaceMock.setTokenPrice("0x3615757011112560521536258c1e7325ae3b48ae", 380407, 200000000);
      // await priceOracleInterfaceMock.setTokenPrice("0x00df91984582e6e96288307e9c2f20b38c8fece9", 380407, 200000000);
      // await priceOracleInterfaceMock.setTokenPrice("0xa1f34744c80e7a9019a5cd2bf697f13df00f9773", 380407, 200000000);
      // await priceOracleInterfaceMock.setTokenPrice("0x543Ff227F64Aa17eA132Bf9886cAb5DB55DCAddf", 380407, 200000000);
      break;
    case "Live":
      externalTokenLockerAddress = "";
      gnoTokenAddress = "0x6810e776880c02933d47db1b9fc05908e5386b96";
      priceOracleInterfaceAddress = "";
      break;
  }

  console.log(`gnoTokenAddress: ${gnoTokenAddress}`);
  console.log(`genTokenAddress: ${genTokenAddress}`);

  daoSchema.schemes = [...(daoSchema.schemes || []), ...
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

  const dao = (await daoCreate(web3, networkName, daoSchema, "true")) as DAO;

// tslint:disable: variable-name

  // final official dates:
  // "lockingPeriodStartDate": "2019-02-18T12:00:00.000",
  // "lockingPeriodEndDate": "2019-03-20T12:00:00.000",

// model dates:
  // const lockingPeriodStartDate = new Date("2019-01-09T12:00:00.000+0200");
  // const lockingPeriodEndDate   = new Date("2019-01-10T12:00:00.000+0200");
  // const lockingPeriodStartDate_mgn = new Date("2019-01-10T11:00:00.000+0200");
  // const lockingPeriodEndDate_mgn   = new Date("2019-01-10T12:00:00.000+0200");
  // const NUM_AUCTIONS = 6;
  // const MAX_LOCK_PERIOD = 43200; // 12 hours in seconds
  // const TOTAL_REP_REWARD = 100000000;

// model II:
  // const lockingPeriodStartDate      = new Date("2019-01-09T12:00:00.000+0200");
  // const lockingPeriodEndDate        = new Date("2019-01-09T17:00:00.000+0200");
  // const lockingPeriodStartDate_mgn  = new Date("2019-01-09T16:00:00.000+0200");
  // const lockingPeriodEndDate_mgn    = new Date("2019-01-09T17:00:00.000+0200");
  // const NUM_AUCTIONS = 5;
  // const MAX_LOCK_PERIOD = 10800; // 3 hours in seconds
  // const TOTAL_REP_REWARD = 100000000;

// alex:
  // const lockingPeriodStartDate = new Date("2019-01-09T12:00:00.000+0200");
  // const lockingPeriodEndDate   = new Date("2019-01-10T12:00:00.000+0200");
  // const lockingPeriodStartDate_mgn = new Date("2019-01-10T11:00:00.000+0200");
  // const lockingPeriodEndDate_mgn   = new Date("2019-01-10T12:00:00.000+0200");
  // const NUM_AUCTIONS = 6;
  // const MAX_LOCK_PERIOD = 43200; // 12 hours in seconds
  // const TOTAL_REP_REWARD = 100000000;

//  const MAX_LOCK_PERIOD = 31536000; // one year (365 days) in seconds

  const lockingPeriodStartDate      = new Date("2019-01-09T12:00:00.000+0200");
  const lockingPeriodEndDate        = new Date("2019-06-09T17:00:00.000+0200");
  const lockingPeriodStartDate_mgn  = new Date("2019-01-09T16:00:00.000+0200");
  const lockingPeriodEndDate_mgn    = new Date("2019-06-09T17:00:00.000+0200");

  const NUM_AUCTIONS = 5;
  // note this may not come out even with the endDate
  const AUCTION_PERIOD = ((lockingPeriodEndDate.getTime() - lockingPeriodStartDate.getTime()) / NUM_AUCTIONS) / 1000;
  const REDEEM_ENABLE_DATE = lockingPeriodEndDate;
  const MAX_LOCK_PERIOD = 10800; // 3 hours in seconds

  const TOTAL_REP_REWARD = 1000000000;
  const AUCTION_BIDDING_RATIO = .1;
  const TOKEN_LOCKING_RATIO = .3;
  const ETH_LOCKING_RATIO = .08;
  const EXTERNAL_LOCKING_RATIO = .5;

  console.log(`lockingPeriodStartDate: ${lockingPeriodStartDate.toString()}`);
  console.log(`lockingPeriodEndDate: ${lockingPeriodEndDate.toString()}`);

  await lockingEth4Reputation.initialize(
    {
      avatarAddress: dao.avatar.address,
      lockingEndTime: lockingPeriodEndDate,
      lockingStartTime: lockingPeriodStartDate,
      maxLockingPeriod: MAX_LOCK_PERIOD,
      redeemEnableTime: REDEEM_ENABLE_DATE,
      reputationReward: web3.toWei(TOTAL_REP_REWARD * ETH_LOCKING_RATIO),
    }
  );

  await externalLocking4Reputation.initialize(
    {
      avatarAddress: dao.avatar.address,
      externalLockingContract: externalTokenLockerAddress,
      getBalanceFuncSignature: "lockedTokenBalances(address)",
      lockingEndTime: lockingPeriodEndDate_mgn,
      lockingStartTime: lockingPeriodStartDate_mgn,
      redeemEnableTime: REDEEM_ENABLE_DATE,
      reputationReward: web3.toWei(TOTAL_REP_REWARD * EXTERNAL_LOCKING_RATIO),
    }
  );

  await lockingToken4Reputation.initialize(
    {
      avatarAddress: dao.avatar.address,
      lockingEndTime: lockingPeriodEndDate,
      lockingStartTime: lockingPeriodStartDate,
      maxLockingPeriod: MAX_LOCK_PERIOD,
      priceOracleContract: priceOracleInterfaceAddress,
      redeemEnableTime: REDEEM_ENABLE_DATE,
      reputationReward: web3.toWei(TOTAL_REP_REWARD * TOKEN_LOCKING_RATIO),
    }
  );

  await auction4Reputation.initialize(
    {
      auctionPeriod: AUCTION_PERIOD,
      auctionsStartTime: lockingPeriodStartDate,
      avatarAddress: dao.avatar.address,
      numberOfAuctions: NUM_AUCTIONS,
      redeemEnableTime: REDEEM_ENABLE_DATE,
      reputationReward: web3.toWei((TOTAL_REP_REWARD * AUCTION_BIDDING_RATIO) / NUM_AUCTIONS),
      tokenAddress: genTokenAddress,
      walletAddress: dao.avatar.address,
    }
  );

  if (networkName === "Ganache") {
    await tokenMint(web3, networkName, gnoTokenAddress, "100", accounts[0]);
    await tokenMint(web3, networkName, gnoTokenAddress, "100", accounts[1]);
    await tokenMint(web3, networkName, gnoTokenAddress, "100", accounts[2]);
  }

  return Promise.resolve();
};

interface Lock4ReputationContract { address: Address; initialize: (...params) => Promise<any>; }
