/**
 * Command handler function type
 */
export type CommandHandler<T extends any[]> = (
  ...args: T
) => void | Promise<void>;

type ExtractArgumentNames<T extends readonly CommandArgument[]> = {
  [K in keyof T]: T[K] extends CommandArgument ? T[K]['name'] : never;
}[number];

type ExtractHandlerArguments<
  T extends readonly CommandArgument[] = readonly CommandArgument[],
> = [
  { [K in ExtractArgumentNames<T>]: string },
  { [key: string]: string } | undefined,
];

/**
 * Command configuration
 */
export interface CommandConfig<
  T extends readonly CommandArgument[] = readonly CommandArgument[],
> {
  name?: string;
  description?: string;
  version?: string;
  options?: CommandOption[];
  arguments?: T;
  action: CommandHandler<ExtractHandlerArguments<T>>;
  alias?: string | string[];
}

/**
 * Command option configuration
 */
interface CommandOption {
  flags: string;
  description?: string;
  defaultValue?: any;
  required?: boolean;
}

/**
 * Command argument configuration
 */
export interface CommandArgument {
  name: string;
  description?: string;
  required?: boolean;
  variadic?: boolean;
}

/**
 * Scanned command information
 */
export interface ScannedCommand {
  path: string;
  relativePath: string;
  commandPath: string[];
  isIndex: boolean;
}

/**
 * Build configuration
 */
export interface BuildConfig {
  /**
   * Source directory containing commands
   * @default './src/commands'
   */
  commandsDir?: string;

  /**
   * Output directory for generated CLI
   * @default './dist'
   */
  outDir?: string;

  /**
   * minify bundle
   */
  minify?: boolean;
}

/**
 * CLI Framework plugin interface
 */
export interface Plugin {
  name: string;
  beforeScan?: (config: BuildConfig) => void | Promise<void>;
  afterScan?: (
    commands: ScannedCommand[],
    config: BuildConfig,
  ) => ScannedCommand[] | Promise<ScannedCommand[]>;
  beforeGenerate?: (
    commands: ScannedCommand[],
    config: BuildConfig,
  ) => void | Promise<void>;
  afterGenerate?: (
    output: string,
    config: BuildConfig,
  ) => string | Promise<string>;
  beforeWrite?: (
    output: string,
    config: BuildConfig,
  ) => string | Promise<string>;
  afterBuild?: (config: BuildConfig) => void | Promise<void>;
}

export const defineCommand = <
  T extends readonly CommandArgument[] = readonly CommandArgument[],
>(
  config: CommandConfig<T>,
): CommandConfig<T> => {
  return config;
};
