import type { CommandArgument, CommandConfig } from './types';

export const defineCommand = <
  T extends readonly CommandArgument[] = readonly CommandArgument[],
>(
  config: CommandConfig<T>,
): CommandConfig<T> => {
  return config;
};
