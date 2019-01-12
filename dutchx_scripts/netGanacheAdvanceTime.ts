import {
  Web3
} from "@daostack/arc.js";

/**
 * increase ganache time by the given number of seconds
 * @param web3 
 * @param networkName 
 * @param seconds 
 */
export const run = async (
  web3: Web3,
  networkName: string,
  seconds: string): Promise<void> => {

  if (networkName !== "Ganache") {
    throw new Error("Only works on Ganache");
  }

  const id = new Date().getTime();

  console.log(`advancing time by (at least) ${seconds} seconds`);

  return new Promise((resolve: (res: any) => any, reject: (err: any) => any): void => {

    web3.currentProvider.sendAsync({
      id,
      jsonrpc: "2.0",
      method: "evm_increaseTime",
      params: [Number.parseInt(seconds)],
    }, (err1: any) => {
      if (err1) { return reject(err1); }

      web3.currentProvider.sendAsync({
        id: id + 1,
        jsonrpc: "2.0",
        method: "evm_mine",
      }, (err2: any, res: any): void => {
        return err2 ? reject(err2) : resolve(res);
      });
    });
  });

  return Promise.resolve();
}
