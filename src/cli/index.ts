#!/usr/bin/env node

import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs-extra';
import type { BuildConfig } from '../types';
import { build, createDefaultConfig, loadConfig } from './build';

const program = new Command();

program
  .name('bn-cli-framework')
  .version('1.0.0')
  .description('A convention-based CLI framework for Node.js');

program
  .command('build')
  .description('Build CLI from commands directory')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-o, --out-dir <path>', 'Output directory for generated CLI')
  .option('-s, --commands-dir <path>', 'Source directory containing commands')
  .option('-b, --bin-name <name>', 'CLI binary name')
  .option('--no-typescript', 'Disable TypeScript support')
  .action(async (options) => {
    try {
      let config: BuildConfig | null = null;

      console.log(chalk.blueBright('🚀 Building CLI...'));

      if (options.config) {
        config = await loadConfig(options.config);
        if (!config) {
          console.error(
            chalk.red(`Failed to load configuration from: ${options.config}`),
          );
          process.exit(1);
        }
      } else {
        config = await loadConfig();
      }

      if (!config) {
        config = createDefaultConfig();
      }

      if (options.outDir) config.outDir = options.outDir;
      if (options.commandsDir) config.commandsDir = options.commandsDir;
      if (options.binName) config.binName = options.binName;
      if (options.typescript === false) config.typescript = false;

      await build(config);
    } catch (error) {
      console.error(chalk.red('Build failed:'), error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new CLI project')
  .option('-n, --name <name>', 'CLI binary name', 'my-cli')
  .option('-t, --typescript', 'Use TypeScript', true)
  .action(async (options) => {
    try {
      console.log(chalk.blue('🚀 Initializing new CLI project...'));

      // Create configuration file
      const config: BuildConfig = {
        binName: options.name,
        version: '1.0.0',
        description: `${options.name} CLI`,
        commandsDir: './src/commands',
        outDir: './dist/cli',
        typescript: options.typescript,
      };

      const configPath = path.join(process.cwd(), 'bn-cli.config.js');
      const configContent = `export default ${JSON.stringify(config, null, 2)};\\n`;

      await fs.writeFile(configPath, configContent, 'utf-8');
      console.log(
        chalk.green(`✓ Created configuration file: bn-cli.config.js`),
      );

      // Create commands directory
      const commandsDir = path.join(
        process.cwd(),
        config.commandsDir as string,
      );
      await fs.ensureDir(commandsDir);

      // Create example command
      const ext = options.typescript ? '.ts' : '.js';
      const indexPath = path.join(commandsDir, `index${ext}`);

      const exampleCommand = options.typescript
        ? `import { defineCommand } from 'bn-cli-framework';

export default defineCommand({
  description: 'Main command',
  options: [
    {
      flags: '-v, --verbose',
      description: 'Enable verbose output',
    },
  ],
  action: async (options = {}) => {
    console.log('Hello from ${options.name}!');
    if (options.verbose) {
      console.log('Verbose mode enabled');
    }
  },
});
`
        : `const { defineCommand } = require('bn-cli-framework');

module.exports = defineCommand({
  description: 'Main command',
  options: [
    {
      flags: '-v, --verbose',
      description: 'Enable verbose output',
    },
  ],
  action: async (options = {}) => {
    console.log('Hello from ${options.name}!');
    if (options.verbose) {
      console.log('Verbose mode enabled');
    }
  },
});
`;

      await fs.writeFile(indexPath, exampleCommand, 'utf-8');
      console.log(
        chalk.green(
          `✓ Created example command: ${path.relative(process.cwd(), indexPath)}`,
        ),
      );

      // Create hello subcommand
      const helloDir = path.join(commandsDir, 'hello');
      await fs.ensureDir(helloDir);
      const helloPath = path.join(helloDir, `index${ext}`);

      const helloCommand = options.typescript
        ? `import { defineCommand } from 'bn-cli-framework';

export default defineCommand({
  description: 'Say hello',
  arguments: [
    {
      name: 'name',
      description: 'Name to greet',
      required: false,
    },
  ],
  action: async ({ name }) => {
    console.log(\`Hello, \${name || 'World'}!\`);
  },
});
`
        : `const { defineCommand } = require('bn-cli-framework');

module.exports = defineCommand({
  description: 'Say hello',
  arguments: [
    {
      name: 'name',
      description: 'Name to greet',
      required: false,
    },
  ],
  action: async ({ name }) => {
    console.log(\`Hello, \${name || 'World'}!\`);
  },
});
`;

      await fs.writeFile(helloPath, helloCommand, 'utf-8');
      console.log(
        chalk.green(
          `✓ Created hello subcommand: ${path.relative(process.cwd(), helloPath)}`,
        ),
      );

      console.log(chalk.green('\\n✅ Project initialized successfully!'));
      console.log(chalk.gray('\\nNext steps:'));
      console.log(
        chalk.cyan(
          '  1. Install bn-cli-framework: npm install bn-cli-framework',
        ),
      );
      console.log(
        chalk.cyan('  2. Build your CLI: npx bn-cli-framework build'),
      );
      console.log(chalk.cyan('  3. Link your CLI: npm link'));
      console.log(chalk.cyan(`  4. Use your CLI: ${options.name} hello`));
    } catch (error) {
      console.error(chalk.red('Initialization failed:'), error);
      process.exit(1);
    }
  });

program.parse(process.argv);
