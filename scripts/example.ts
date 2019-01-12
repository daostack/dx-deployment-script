import {
  InitializeArcJs,
  LoggingService,
  LogLevel,
  Web3
} from "@daostack/arc.js";

export const run = async (web3: Web3, networkName: string, ...rest: Array<string>): Promise<void> => {
  console.log(`exampleMethod(${web3},${networkName},${rest})`);
  LoggingService.logLevel = LogLevel.all;
  await InitializeArcJs();
  return Promise.resolve();
}
