# HEFS CLI Example

This is an example CLI application built with `bn-cli-framework`, demonstrating the convention-based command structure.

## Project Structure

```
example/
├── src/
│   └── commands/
│       ├── index.ts        # Main command (hefs)
│       ├── hi/
│       │   └── index.ts    # Subcommand (hefs hi)
│       └── deploy/
│           └── index.ts    # Subcommand (hefs deploy)
├── bn-cli.config.js        # Framework configuration
└── package.json
```

## Setup

1. Install dependencies:
```bash
cd example
npm install
```

2. Build the CLI:
```bash
npm run build
# or
npx bn-cli-framework build
```

3. Link the CLI globally (optional):
```bash
npm link
```

## Usage

After building and linking:

### Main Command
```bash
hefs
# Shows welcome message and available commands

hefs --verbose
# Runs with verbose output

hefs --debug
# Runs with debug mode
```

### Hi Command
```bash
hefs hi
# Output: Hello, World!

hefs hi John
# Output: Hello, John!

hefs hi John --uppercase
# Output: HELLO, JOHN!

hefs hi --color red
# Output in red color

hefs hello  # Alias for 'hi'
hefs greet  # Another alias for 'hi'
```

### Deploy Command
```bash
hefs deploy dev
# Deploys to development environment

hefs deploy production --tag v1.2.3
# Deploys to production with a specific tag

hefs deploy staging --dry-run
# Simulates deployment without making changes

hefs deploy production --force
# Forces deployment without confirmation
```

## How It Works

1. **Convention-based Routing**: The framework automatically maps file structure to commands:
   - `src/commands/index.ts` → `hefs` (main command)
   - `src/commands/hi/index.ts` → `hefs hi` (subcommand)
   - `src/commands/deploy/index.ts` → `hefs deploy` (subcommand)

2. **Command Definition**: Each command file exports a configuration object using `defineCommand()`:
   ```typescript
   import { defineCommand } from 'bn-cli-framework';

   export default defineCommand({
     description: 'Command description',
     options: [...],
     arguments: [...],
     action: async (...args) => {
       // Command logic
     }
   });
   ```

3. **Build Process**: The framework scans the commands directory and generates a complete CLI application with proper command registration.

## Adding New Commands

To add a new command, simply create a new file or directory in `src/commands/`:

### Example: Adding a `config` command
Create `src/commands/config/index.ts`:
```typescript
import { defineCommand } from 'bn-cli-framework';

export default defineCommand({
  description: 'Manage configuration',
  action: async () => {
    console.log('Configuration management');
  }
});
```

Then rebuild:
```bash
npm run build
```

Now you can use:
```bash
hefs config
```

## Benefits

- ✅ **Zero Configuration**: Commands are automatically discovered
- ✅ **Type Safety**: Full TypeScript support
- ✅ **Nested Commands**: Support for deep command hierarchies
- ✅ **Automatic Help**: Generated help for all commands
- ✅ **Aliases**: Support for command aliases
- ✅ **Options & Arguments**: Rich command configuration
