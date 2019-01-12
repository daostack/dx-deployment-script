# arc.js-scripts
Scripts that run against @daostack/arc.js

## Installation

Clone or fork the arc.js-scripts repository from GitHub, then:

```
npm install
npm run build
```

## Run a Script

1. Create a JavaScript file that exports a method that returns a promise that it is complete.
 When arc.js-scripts runs your script, the method will be invoked with two parameters: `web3` and the name of the network in lowercase.
 
    Two globals will also be made available: `web3` and `accounts`.
 
    See [scripts/example.ts](https://github.com/dkent600/arc.js-scripts/blob/master/scripts/example.ts) for an example of a script.
    
    Note that `npm run build` transpiles example.ts into the required JavaScript, putting the generated JavaScript in the "build/scripts" directory.
    
    When you refer to the script on the command line (see below), you must refer to a JavaScript file, not to TypeScript.

2. Run the script

    Get help on command line options:
    
    ```
    npm run help
    ```

    Run the example script against a local node with default url and port:

    ```
    npm run script example
    ```

    It will look for your script in "build/scripts" or "build/local_scripts".

## Use truffle-hdwallet-provider

  If you want to use the truffle-hdwallet-provider rather than a local node then you may supply the `providerConfig` option:

  ```
  npm run script -- -c "/path/to/a/json/file.json" example
  ```

  The path should reference a json file containing a truffle-hdwallet-provider configuration, looking something like this:

  <pre>
  {
    "name: "kovan",
    "mnemonic": "...",
    "providerUrl": "https://kovan.infura.io/..."
  }</pre>

  Instead of using a configuration file you may pass a mnemonic with optionally a uri and port:

  ```
  npm run script -- -n "file turkey house..." -u "http://127.198.0.1" -p 8890` example
  ```

  Or with default url and port:

  ```
  npm run script -- -n "file turkey house..." example
  ```

## Notes

* Your method may call `InitializeArcJs` for cases where you want to use Arc contracts (see scripts/example.ts).

* TypeScript is not necessary, you can create your JavaScript script files however you want.  But if you want you can easily create scripts using TypeScript by placing your .ts files anywhere under the project root  folder and running `npm run build` to compile them.  The generated JavaScript will appear in the "build" folder.  If you put your typescript files in another folder called "local_scripts" in the project root, then after running `npm run build` you can run your script like this:

    ```
    npm run script yourScript
    ```

* If you are using truffle-hdwallet-provider and you run a script and it connects to the provider but then returns without executing your script, make sure that a node is listening on the url you
provided in your provider configuration file.

* The default name of the method that will be executed is "run".  You may use a different method name and specify it on the command line using the "method"  parameter.

* The "scripts" directory contains some useful scripts that you can use, for example:

    Script | Purpose
    ---------|----------
    accountLists | list all of the accounts known to the current web3
    contractNew | instantiate an Arc contract given its name and contructor parameters in json
    daoCreate | create a DAO given a json spec for the DAO
    daoParticipantsActivity | Output information about DAO participant activity.  Currently only for ContributionReward.
    daoParticipantsList | list participants in the given DAO, by reputation
    daoSchemesList | list the schemes registered with the given DAO
    daosList | list the names and addresses of all the DAOs created using the Arc DaoCreator contract in the packaged version of Arc.js
    ethTransfer | transfer ETH from one account to another
    proposalVote | cast a vote on the given proposal with the given voting machine
    proposalGpStake | stake on a vote on the given proposal with the given GenesisProtocol
    schemeDump | show basic information about a scheme regstered to a DAO
    tokenTransfer | transfer tokens from one account to another
    tokenMint | mint tokens to an account
