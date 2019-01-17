import {
  Address,
  ConfigService,
  Utils,
  Web3
} from '@daostack/arc.js';
import axios from 'axios';
import { BigNumber } from 'bignumber.js';
import { promisify } from 'es6-promisify';
import { Common } from './common';

/**
 * Instantiate a contract given the json specification for it.
 * Logs the resulting address to the console.
 *
 * The spec should look like this
 * ```
 * {
 *   name: "arcContractName",
 *   constructorParams: [value1, value2, value3, .... ],
 *   initializeParams: []
 * }
 * ```
 *
 * `constructorParams` can be omitted if there are no params
 * `initializeParams` is only for contracts that have an `initialize` method after being constructed
 *
 * @param web3
 * @param networkName
 * @param jsonSpec
 * @param gas optional gas amount.  if set to "max" then will use a high limit close to the current block limit
 * @param gasPrice optional gas price.  if set to "estimate" then will use a gas price obtained from ethgastation.
 * "estimate" only works on mainnet!
 */
export const run = async (
  web3: Web3,
  networkName: string,
  jsonSpec: string | object,
  gas: string = null,
  gasPrice: string = null
): Promise<{ address: Address }> => {

  if (!jsonSpec) {
    throw new Error('jsonSpec was not supplied');
  }

  const spec = (typeof (jsonSpec) === 'object') ? jsonSpec : require(jsonSpec as string);

  if (!spec.name) {
    throw new Error('contract name was not supplied');
  }

  const params = spec.constructorParams || [];
  const web3Params = {} as any;

  if (!gas) {
    throw new Error(`gas was not supplied`);
  }

  if (gas === 'max') {
    gas = (await Common.computeMaxGasLimit(web3)).toString();
  }
  web3Params.gas = Number.parseInt(gas, 10);

  if (!gasPrice) {
    throw new Error(`gasPrice was not supplied`);
  }

  if (gasPrice === 'estimate') {
    ConfigService.set('gasPriceAdjustment', async (defaultGasPrice: BigNumber) => {
      try {
        const response = await axios.get('https://ethgasstation.info/json/ethgasAPI.json');
        // the api gives results if 10*Gwei
        const computedGasPrice = response.data.fast / 10;
        return web3.toWei(computedGasPrice, 'gwei');
      } catch (e) {
        return defaultGasPrice;
      }
    });
  } else {
    web3Params.gasPrice = Number.parseInt(gasPrice, 10);
  }

  params.push(web3Params);

  let truffleContract;
  try {
    truffleContract = await Utils.requireContract(spec.name);
  } catch (ex) {
    throw new Error(`can't find '${spec.name}': ${ex.message ? ex.message : ex}`);
  }

  console.log(`instantiating ${spec.name}`);

  const newContract = await truffleContract.new(...params);

  // /**
  //  * wait until mined
  //  */
  // while (true) {
  //   const code = await promisify((callback: any): any =>
  //     web3.eth.getCode(newContract.address, callback))();
  //   if (code && (code.length)) {
  //     break;
  //   }
  // }

  console.log(`new ${spec.name} address: ${newContract.address} `);

  const initializeParams = spec.initializeParams || [];

  if (initializeParams.length) {
    console.log(`initializing ${spec.name}`);
    await newContract.initialize(...initializeParams);
  }

  return Promise.resolve(newContract);
};
