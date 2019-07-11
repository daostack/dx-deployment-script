import { promisify } from 'es6-promisify';

export class Common {

  /**
   * The number in millseconds that truffle waits to return a mined transaction,
   * where 0 means no timeout and `undefined` (absent) means use truffle's default value.
   * @param contract
   */
  public static setTruffleTimeout(contract: any, msTimeout?: number): void {
    // number in milliseconds where 0 means no timeout
    contract.constructor.synchronization_timeout = msTimeout;
  }

  public static sleep(milliseconds: number): Promise<any> {
    return new Promise((resolve: () => void): any => setTimeout(resolve, milliseconds));
  }

  public static computeMaxGasLimit(web3): Promise<number> {

    return promisify((callback) => web3.eth.getBlock('latest', false, callback))()
      .then((block) => {
        return block.gasLimit - 100000;
      });
  }

  public static isTruthy(str: string): boolean {
    return JSON.parse(str);
  }

}
