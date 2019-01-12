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
import BigNumber from "bignumber.js";

export const run = async (web3: Web3, networkName: string): Promise<void> => {

// tslint:disable: max-line-length

  await InitializeArcJs({
    filter: {},
  });

  ConfigService.set("estimateGas", true);

  const lockingEth4Reputation =
    await LockingEth4ReputationFactory.at("0x4887751ed41954c4b0290651f5bca6b8ca964c02");
  const lockingToken4Reputation =
    await LockingToken4ReputationFactory.at("0xf8519d354175af15f0d9ac0f5520a9a29a0e9397");
  const externalLocking4Reputation =
    await ExternalLocking4ReputationFactory.at("0x334d6194c82baf1717ff9fe8092a4db08e147535");
  const auction4Reputation =
    await Auction4ReputationFactory.at("0x8d32806347985dea4c759db95196f1859d559c36");

  const dao = DAO.at("0x7236bee92b9b724ff0cc5b0d17c12734e875037e");

  const accounts: Array<Address> = [
    "0xb1ba56fc6ed94d45ca47cc9e97df68f3df772d42",
    "0x7539A96097e5214DA7336be510cDDD415339949e",
    "0x6d1a4be65723355a9f5b12c446780a5000849461",
    "0x8b166ADD384dCe341F0C7c94CF5E65B495D33d6F",
    "0xF16294a979a027F297DAcE2F618Cb57bc4Bf5d16",
    "0x73Db6408abbea97C5DB8A2234C4027C315094936",
    "0xe7b81Ae742Fdc4Cac5F6280aa91Bc28D6df34a89",
  ];

  const auctions = await auction4Reputation.getNumberOfAuctions();

  for (const address of accounts) {
    // const address = accounts[accountNdx];
    console.log(`account: ${address}`);
    let rep: string;

    let score = await externalLocking4Reputation.contract.scores(address);
    rep = score.eq(0) ? "0" : web3.fromWei(await externalLocking4Reputation.contract.redeem.call(address));
    console.log(`  eth: ${rep}`);

    score = await lockingToken4Reputation.contract.scores(address);
    rep = score.eq(0) ? "0" : web3.fromWei(await lockingToken4Reputation.contract.redeem.call(address));
    console.log(`  token: ${rep}`);

    score = await externalLocking4Reputation.contract.scores(address);
    rep = score.eq(0) ? "0" : web3.fromWei(await externalLocking4Reputation.contract.redeem.call(address));
    console.log(`  external: ${rep}`);

    for (let auctionId = 0; auctionId < auctions;  ++auctionId) {
      const bid = await auction4Reputation.contract.getBid(address, auctionId);
      rep = bid.eq(0) ? "0" : web3.fromWei(await auction4Reputation.contract.redeem.call(address, auctionId));
      console.log(`  auction ${auctionId}: ${rep}`);
    }
  }

  return Promise.resolve();
};
