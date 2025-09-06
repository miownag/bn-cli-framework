#!/usr/bin/env node

import { execSync } from 'node:child_process';
import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs-extra';
import { version } from '../../package.json';
import type { BuildConfig } from '..';
import { getPackageJSON, queryLatestVersions } from '../utils';
import { build, createDefaultConfig, loadConfig } from './build';

const program = new Command();

program
  .name('bn-cli-framework')
  .version(version)
  .description('A convention-based CLI framework for Node.js');

program
  .command('build')
  .description('Build CLI from commands directory')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('-o, --out-dir <path>', 'Output directory for generated CLI')
  .option('-s, --commands-dir <path>', 'Source directory containing commands')
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

      await build(config);
    } catch (error) {
      console.error(chalk.red('Build failed:'), error);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('Initialize a new CLI project')
  .action(async () => {
    try {
      console.log(chalk.blue('🚀 Initializing new CLI project...'));

      execSync('npm init -y', { stdio: 'inherit' });

      const [bnVersion, tsVersion, nodeTypeVersion] = await queryLatestVersions(
        ['bn-cli-framework', 'typescript', '@types/node'],
      );

      const packageJsonPath = path.join(process.cwd(), 'package.json');
      const packageJson = await getPackageJSON();
      const packageName = packageJson.name;

      packageJson.bin = {
        [packageName]: './dist/index.cjs',
      };
      packageJson.main = './dist/index.cjs';
      packageJson.type = 'module';

      packageJson.devDependencies = packageJson.devDependencies || {};
      packageJson.devDependencies['bn-cli-framework'] = `^${bnVersion}`;
      packageJson.devDependencies['typescript'] = `^${tsVersion}`;
      packageJson.devDependencies['@types/node'] = `^${nodeTypeVersion}`;

      packageJson.scripts = packageJson.scripts || {};
      packageJson.scripts.build = 'bn-cli-framework build';

      await fs.writeJSON(packageJsonPath, packageJson, { spaces: 2 });
      console.log(chalk.green('✓ Updated package.json'));

      // Create configuration file
      const config: BuildConfig = {
        commandsDir: './src/commands',
        outDir: './dist',
      };

      const configPath = path.join(process.cwd(), 'bn-cli.config.js');
      const configContent = `export default ${JSON.stringify(config, null, 2)};\n`;

      await fs.writeFile(configPath, configContent, 'utf-8');
      console.log(
        chalk.green(`✓ Created configuration file: bn-cli.config.js`),
      );

      const tsConfig = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}`;
      await fs.writeFile('tsconfig.json', tsConfig, 'utf-8');
      console.log(chalk.green('✓ Created tsconfig.json'));

      const commandsDir = path.join(
        process.cwd(),
        config.commandsDir as string,
      );
      await fs.ensureDir(commandsDir);

      const indexPath = path.join(commandsDir, 'index.ts');

      const exampleCommand = `import { defineCommand } from 'bn-cli-framework';

export default defineCommand({
  description: 'Main command',
  options: [
    {
      flags: '-v, --verbose',
      description: 'Enable verbose output',
    },
  ],
  action: async (options = {}) => {
    console.log('Hello from ${packageName}!');
    if (options?.verbose) {
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
      const helloPath = path.join(helloDir, 'index.ts');

      const helloCommand = `import { defineCommand } from 'bn-cli-framework';

export default defineCommand({
  description: 'Say hello',
  arguments: [
    {
      name: 'name',
      description: 'Name to greet',
      required: false,
    },
  ] as const,
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

      console.log(chalk.green('\n✅ Project initialized successfully!'));
      console.log(chalk.gray('\nNext steps:'));
      console.log(chalk.cyan('  1. Install dependencies: npm install'));
      console.log(chalk.cyan('  2. Build your CLI: npm run build'));
      console.log(chalk.cyan('  3. Link your CLI: npm link'));
      console.log(chalk.cyan(`  4. Use your CLI: ${packageName} hello`));
    } catch (error) {
      console.error(chalk.red('Initialization failed:'), error);
      process.exit(1);
    }
  });

program.parse(process.argv);
