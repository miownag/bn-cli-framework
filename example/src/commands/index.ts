import { defineCommand } from 'bn-cli-framework';
import chalk from 'chalk';

export default defineCommand({
  description: 'HEFS CLI - A powerful command-line tool',
  version: '1.0.0',
  options: [
    {
      flags: '-v, --verbose',
      description: 'Enable verbose output',
      defaultValue: false,
    },
    {
      flags: '-d, --debug',
      description: 'Enable debug mode',
      defaultValue: false,
    },
  ],
  action: async (options = {}) => {
    console.log(chalk.blue('Welcome to HEFS CLI!'));
    console.log(chalk.gray('A CLI tool built with bn-cli-framework'));

    if (options.verbose) {
      console.log(chalk.yellow('Verbose mode is enabled'));
    }

    if (options.debug) {
      console.log(chalk.red('Debug mode is enabled'));
    }

    console.log(chalk.gray('\nAvailable commands:'));
    console.log(
      chalk.cyan('  hefs hi          ') + chalk.gray('Say hello with style'),
    );
    console.log(
      chalk.cyan('  hefs deploy      ') + chalk.gray('Deploy your application'),
    );
    console.log(chalk.gray('\nRun hefs <command> --help for more information'));
  },
});
