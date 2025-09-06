import { defineCommand } from 'bn-cli-framework';
import chalk from 'chalk';

export default defineCommand({
  description: 'Say hello with style',
  alias: ['hello', 'greet'],
  arguments: [
    {
      name: 'name',
      description: 'Name to greet',
      required: false,
    },
  ] as const,
  options: [
    {
      flags: '-u, --uppercase',
      description: 'Display in uppercase',
      defaultValue: 'false',
    },
    {
      flags: '-c, --color <color>',
      description: 'Text color (red, green, blue, yellow, cyan, magenta)',
      defaultValue: 'blue',
    },
  ],
  action: async (args, options = {}) => {
    const { name } = args;
    const greeting = `Hello, ${name || 'World'}!`;
    const finalGreeting = options.uppercase ? greeting.toUpperCase() : greeting;

    // Apply color based on option
    const colors: Record<string, any> = {
      red: chalk.red,
      green: chalk.green,
      blue: chalk.blue,
      yellow: chalk.yellow,
      cyan: chalk.cyan,
      magenta: chalk.magenta,
    };

    const colorFn = colors[options.color] || chalk.blue;
    console.log(colorFn(finalGreeting));

    console.log(
      chalk.gray(`
    👋 Welcome to HEFS CLI!
    ╔═══════════════════════╗
    ║  Built with ❤️ using   ║
    ║  bn-cli-framework     ║
    ╚═══════════════════════╝
    `),
    );
  },
});
