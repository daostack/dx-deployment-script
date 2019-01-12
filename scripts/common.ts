import { promisify } from 'es6-promisify';

export class Common {

  public static sleep(milliseconds: number): Promise<any> {
    return new Promise((resolve: () => void): any => setTimeout(resolve, milliseconds));
  }

  public static computeMaxGasLimit(web3): Promise<number> {

    return promisify((callback) => web3.eth.getBlock("latest", false, callback))()
      .then((block) => {
        return block.gasLimit - 100000;
      });
  }

  public static isTruthy(str: string): boolean {
    return JSON.parse(str);
  }

}
