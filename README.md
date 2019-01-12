# Dutchx Deployment Script
A script that creates a simulated DutchX DAO.  The script framework is derived from [@daostack/arc.js-scripts](https://github.com/daostack/arc.js-scripts).

## Installation

```
npm install
npm run build
npm run migrateContracts
```

## Create a Dutchx DAO

The script is "dutchx_scripts\daoCreateDutchX.ts".

DAO specs per network are in "dutchx_scripts\specsNewDaos".

### On Ganache

```
npm run ganache
npm run migrateContracts
npm run script daoCreateDutchX
```

### On Kovan or Rinkeby

Provide a nmemonic and url:

```
npm run script -- -n "file turkey house..." -u "https://kovan.infura.io/..." daoCreateDutchX
```

## Help

After running `npm run build`, run:

```
npm run help
```

### More About Arc.Js-Scripts

See [@daostack/arc.js-scripts](https://github.com/daostack/arc.js-scripts)
