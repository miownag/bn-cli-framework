import path from 'node:path';
import chalk from 'chalk';
import fs from 'fs-extra';
import type { BuildConfig, Plugin } from '../types';
import { generateBinField, generateCLI, writeCLI } from './generator';
import { scanCommands, validateCommands } from './scanner';

export const build = async (config: BuildConfig, plugins: Plugin[] = []) => {
  try {
    if (!config.binName) {
      throw new Error('binName is required in build configuration');
    }

    for (const plugin of plugins) {
      if (plugin.beforeScan) {
        await plugin.beforeScan(config);
      }
    }

    console.log(chalk.gray('  Scanning commands directory...'));
    let commands = await scanCommands(config);

    if (commands.length === 0) {
      console.log(
        chalk.yellow('  ⚠️  No commands found in the commands directory'),
      );
      console.log(
        chalk.gray(
          `     Expected location: ${path.resolve(process.cwd(), config.commandsDir || './src/commands')}`,
        ),
      );
      return;
    }

    console.log(chalk.green(`  ✓ Found ${commands.length} command(s)`));

    for (const plugin of plugins) {
      if (plugin.afterScan) {
        const result = await plugin.afterScan(commands, config);
        if (result) {
          commands = result;
        }
      }
    }

    console.log(chalk.gray('  Validating commands...'));
    validateCommands(commands);
    console.log(chalk.green('  ✓ Commands validated'));

    for (const plugin of plugins) {
      if (plugin.beforeGenerate) {
        await plugin.beforeGenerate(commands, config);
      }
    }

    console.log(chalk.gray('  Generating CLI code...'));
    let code = await generateCLI(commands, config);

    for (const plugin of plugins) {
      if (plugin.afterGenerate) {
        const result = await plugin.afterGenerate(code, config);
        if (result) {
          code = result;
        }
      }
    }

    for (const plugin of plugins) {
      if (plugin.beforeWrite) {
        const result = await plugin.beforeWrite(code, config);
        if (result) {
          code = result;
        }
      }
    }

    console.log(chalk.gray('  Writing CLI file...'));
    const outputFile = writeCLI(code, config);
    console.log(chalk.green(`  ✓ CLI written to ${outputFile}`));

    await updatePackageJson(config);

    for (const plugin of plugins) {
      if (plugin.afterBuild) {
        await plugin.afterBuild(config);
      }
    }

    console.log(chalk.green('\n✅ Build completed successfully!'));
    console.log(chalk.gray(`\n  To test your CLI, run:`));
    console.log(chalk.cyanBright(`    1. npm link`));
    console.log(chalk.cyanBright(`    2. ${config.binName} <command>`));
  } catch (error) {
    console.error(chalk.red('\n❌ Build failed:'));
    console.error(
      chalk.red(`   ${error instanceof Error ? error.message : error}`),
    );
    process.exit(1);
  }
};

/**
 * Update package.json with bin field
 */
const updatePackageJson = async (config: BuildConfig) => {
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (!(await fs.pathExists(packageJsonPath))) {
    console.log(
      chalk.yellow('  ⚠️  package.json not found, skipping bin field update'),
    );
    return;
  }

  try {
    const packageJson = await fs.readJson(packageJsonPath);
    const binField = generateBinField(config);

    const currentBin = packageJson.bin || {};
    const needsUpdate =
      JSON.stringify(currentBin) !==
      JSON.stringify({ ...currentBin, ...binField });

    if (needsUpdate) {
      packageJson.bin = { ...currentBin, ...binField };
      await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      console.log(chalk.green('  ✓ Updated package.json bin field'));
    }
  } catch (error) {
    console.log(
      chalk.yellow(
        `  ⚠️  Failed to update package.json: ${error instanceof Error ? error.message : error}`,
      ),
    );
  }
};

/**
 * Load build configuration from file
 */
export const loadConfig = async (configPath?: string) => {
  const possiblePaths = configPath
    ? [configPath]
    : [
        'bn-cli.config.js',
        'bn-cli.config.ts',
        'bn-cli.config.mjs',
        'bn-cli.config.cjs',
        '.bnclirc.js',
        '.bnclirc.json',
      ];

  for (const configFile of possiblePaths) {
    const fullPath = path.resolve(process.cwd(), configFile);
    if (await fs.pathExists(fullPath)) {
      try {
        if (configFile.endsWith('.json')) {
          return await fs.readJson(fullPath);
        } else {
          const module = await import(fullPath);
          return module.default || module;
        }
      } catch (error) {
        console.warn(
          chalk.yellow(
            `Failed to load config from ${configFile}: ${error instanceof Error ? error.message : error}`,
          ),
        );
      }
    }
  }

  return null;
};

export const createDefaultConfig = (
  overrides: Partial<BuildConfig> = {},
): BuildConfig => {
  return {
    commandsDir: './src/commands',
    outDir: './dist/cli',
    binName: 'my-cli',
    version: '1.0.0',
    description: 'My CLI tool',
    typescript: true,
    ...overrides,
  };
};
