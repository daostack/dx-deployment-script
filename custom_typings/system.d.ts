declare module "system" {
  global {
    var window: Window;
    var artifacts: any;
    let accounts: Array<string>;
  }
}

declare module "web3" {
  global {
    let web3: Web3;
  }
}

declare module "*.json" {
  const value: any;
  export default value;
}
