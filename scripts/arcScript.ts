/* tslint:disable:no-console */
/* tslint:disable:no-var-requires */
import { ConfigService, Utils } from "@daostack/arc.js";
import { promisify } from "es6-promisify";
import { Web3 } from "web3";
const path = require("path");
const fs = require("fs-extra");
const commandLineArgs = require("command-line-args");
const validUrl = require("valid-url");
const commandLineUsage = require("command-line-usage");

class FileDetails {
  public filename: string;
  public exists: boolean;

  constructor(filename) {
    this.filename = filename;
    this.exists = fs.existsSync(filename);
  }
}

// tslint:disable: max-line-length

const optionDefinitions = [
  { name: "help", alias: "h", type: Boolean, description: "show these command line options" },
  { name: "script", multiple: true, defaultOption: true, type: String, description: "(required) path to javascript script file, either absolute or relative to 'build' (or to 'build/scripts' if you are compiling folders in addition to the scripts folder)" },
  { name: "method", alias: "m", type: String, description: "name of the method to execute, default: \"run\"" },
  { name: "providerConfig", alias: "c", type: providerConfig => new FileDetails(providerConfig), description: "absolute path to a JSON file specifying a mnemonic and url (including port)" },
  { name: "url", alias: "u", type: String, description: "url when not using providerConfig, default: 'http://127.0.0.1'" },
  { name: "port", alias: "p", type: Number, description: "port when not using providerConfig, default: 8545" },
  { name: "mnemonic", alias: "n", type: String, description: "mnemonic like \"bird fish sheep ....\", when not using providerConfig" },
];

module.paths.push(path.join(__dirname, "../scripts"));
module.paths.push(path.join(__dirname, "../dutchx_scripts"));

const options = commandLineArgs(optionDefinitions);

const usage = (): void => {
  const sections = [
    {
      content: "Run scripts agains DAOstack Arc.js.",
      header: "arcScript",
    },
    {
      header: "Options",
      optionList: optionDefinitions,
    },
  ];

  console.log(commandLineUsage(sections));
};

let provider;

const exit = (code: number = 0): void => {
  if (provider) {
    // console.log("stopping provider engine...");
    // see: https://github.com/trufflesuite/truffle-hdwallet-provider/issues/46
    provider.engine.stop();
  }
  process.exit(code);
};

// console.dir(options);

if (options.help) {
  usage();
  exit();
}

let providerConfigPath: string;
let url: string;
let port: number;
let mnemonic: string;

if (options.providerConfig && options.mnemonic) {
  console.log(`can't supply providerConfig and mnemonic at the same`);
  exit();
}

if (options.providerConfig && (options.url || options.port)) {
  console.log(`can't supply providerConfig and url or port at the same`);
  exit();
}

// if (options.mnemonic && !options.url) {
//   console.log(`must supply mnemonic and url together`);
//   exit();
// }

if (options.mnemonic) {
  mnemonic = options.mnemonic;
} else if (options.providerConfig) {
  if (!options.providerConfig.exists) {
    console.log(`provider file does not exist`);
    exit();
  }
  providerConfigPath = options.providerConfig.filename;
}

if (options.url) {
  url = options.url;
  port = options.port;
}

if (!options.script || !options.script.length) {
  console.log(`script name is required`);
  exit();
}

const scriptPath = path.normalize(options.script[0]);
const extraParameters = options.script.slice(1);

if (!options.method) {
  options.method = "run";
}

const connectToNetwork = async (): Promise<void> => {
  const webConstructor = require("web3");

  const providerConfig = providerConfigPath ? require(providerConfigPath) :
  {
    mnemonic,
    providerUrl: `${url || "http://127.0.0.1"}:${ port || "8545" }`,
  };

  const HDWalletProvider = require("truffle-hdwallet-provider");
  const NonceTrackerSubprovider = require("web3-provider-engine/subproviders/nonce-tracker");
  console.log(`Provider: '${providerConfig.providerUrl}'`);
  console.log(`Account: '${providerConfig.mnemonic}'`);
  provider = new HDWalletProvider(providerConfig.mnemonic, providerConfig.providerUrl);
  if (providerConfig.name && (providerConfig.name.toLowerCase() === "infura")) {
    console.log("applying NonceTrackerSubprovider");
    // see https://ethereum.stackexchange.com/a/50038/21913
    const nonceTracker = new NonceTrackerSubprovider();
    provider.engine._providers.unshift(nonceTracker);
    nonceTracker.setEngine(provider.engine);
  }
  (global as any).web3 = new webConstructor(provider);
};

try {

  const runScript = async (): Promise<void> => {

    if (providerConfigPath || mnemonic) {
      await connectToNetwork();
    } else {
      if (url) {
        const index = url.startsWith("http://") ? 7 : url.startsWith("https://") ? 8 : 0;

        if (index) {
          url = url.slice(index);
        }

        ConfigService.set("providerUrl", url); 
      }

      if (port) { ConfigService.set("providerPort", port); }
    }

    /**
     * Note that if no node is listening at the provider's url, particularly with ganache, this
     * may disappear into la-la land.  In that case web3.net.getListening will not have invoked its
     * given callback, leaving us adrift.
     */
    return Utils.getWeb3()
      .then(async (web3: Web3) => {
        const networkName = await Utils.getNetworkName();
        (global as any).accounts = await promisify(web3.eth.getAccounts)();

        console.log(`Default account: ${accounts[0]}`);

        console.log(`Executing ${scriptPath} ${extraParameters}`);

        const script = require(scriptPath);
        const method = options.method;

        // console.log(`Executing ${method}`);

        return script[method](web3, networkName, ...extraParameters)
          .then(() => {
            // console.log(`Completed ${method}`);
            exit();
          })
          .catch((ex: Error) => {
            console.log(`Error in ${method}: ${ex.message ? ex.message : ex}`);
            exit();
          });
      })
      .catch((ex: Error) => {
        console.log(`Error: ${ex.message ? ex.message : ex}`);
        exit();
      });
  };

  runScript();
} catch (ex) {
  console.log(`an error occurred: ${ex}`);
}
