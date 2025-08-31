import { spawnSync } from 'node:child_process';
import path from 'node:path';
import fs from 'fs-extra';
import type { BuildConfig, ScannedCommand } from '../types';

const getCommanderActionContent = (program: string, configString: string) => {
  return `    ${program}.action((...args) => {
            const argumentsLen = ${configString}.arguments?.length || 0;
            const arguments1 = ${configString}.arguments?.reduce((res, arg, index) => {
                if (arg.name) res[arg.name] = args[index];
                return res;
              }, {} as any) || {};
            if (args.length === argumentsLen) ${configString}.action(arguments1);
            if (args.length > argumentsLen) {
              ${configString}.action(arguments1, args[args.length - 1]);
            }
          });`;
};

export const generateCLI = async (
  commands: ScannedCommand[],
  config: BuildConfig,
) => {
  const imports = generateImports(commands);

  const registrations = await generateRegistrations(commands, config);

  const template = config.template || getDefaultTemplate();

  const code = template
    .replace('{{IMPORTS}}', imports)
    .replace('{{BIN_NAME}}', config.binName)
    .replace('{{VERSION}}', config.version || '1.0.0')
    .replace('{{DESCRIPTION}}', config.description || `${config.binName} CLI`)
    .replace('{{REGISTRATIONS}}', registrations);

  return code;
};

const generateImports = (commands: ScannedCommand[]) => {
  const imports: string[] = [];

  imports.push(`import { Command } from 'commander';`);
  imports.push(``);

  commands.forEach((command, index) => {
    const relativePath = path.relative(
      path.dirname(path.join('./.temp', 'index.js')),
      command.path,
    );

    const importPath = relativePath
      .replace(/\\\\/g, '/')
      .replace(/\\.(ts|js)$/, '');
    imports.push(`import command_${index} from '${importPath}';`);
  });

  return imports.join('\n');
};

const generateRegistrations = async (
  commands: ScannedCommand[],
  config: BuildConfig,
) => {
  const registrations: string[] = [];
  const commandMap = new Map<string, string>();

  // Create main program
  registrations.push(`const program = new Command();`);
  registrations.push(`program`);
  registrations.push(`  .name('${config.binName}')`);
  registrations.push(`  .version('${config.version || '1.0.0'}')`);
  registrations.push(
    `  .description('${config.description || `${config.binName} CLI`}');`,
  );
  registrations.push(``);

  const commandsByDepth = new Map<number, ScannedCommand[]>();
  for (const command of commands) {
    const depth = command.commandPath.length;
    if (!commandsByDepth.has(depth)) {
      commandsByDepth.set(depth, []);
    }
    commandsByDepth.get(depth)?.push(command);
  }

  const depths = Array.from(commandsByDepth.keys()).sort((a, b) => a - b);

  for (const depth of depths) {
    const commandsAtDepth = commandsByDepth.get(depth) as ScannedCommand[];

    for (let i = 0; i < commandsAtDepth.length; i++) {
      const command = commandsAtDepth[i];
      const commandIndex = commands.indexOf(command);
      const commandVar = `command_${commandIndex}`;
      const commandPath = command.commandPath.join(' ');

      if (depth === 0) {
        registrations.push(`// Register root command`);
        registrations.push(`if (typeof ${commandVar} === 'function') {`);
        registrations.push(`  const config = ${commandVar}();`);
        registrations.push(`  if (config.action) {`);
        registrations.push(getCommanderActionContent('program', 'config'));
        registrations.push(`  }`);
        registrations.push(`  if (config.options) {`);
        registrations.push(`    config.options.forEach(opt => {`);
        registrations.push(
          `      program.option(opt.flags, opt.description, opt.defaultValue);`,
        );
        registrations.push(`    });`);
        registrations.push(`  }`);
        registrations.push(
          `} else if (${commandVar} && ${commandVar}.action) {`,
        );
        registrations.push(getCommanderActionContent('program', commandVar));
        registrations.push(`  if (${commandVar}.options) {`);
        registrations.push(`    ${commandVar}.options.forEach(opt => {`);
        registrations.push(
          `      program.option(opt.flags, opt.description, opt.defaultValue);`,
        );
        registrations.push(`    });`);
        registrations.push(`  }`);
        registrations.push(`}`);
        registrations.push(``);
      } else {
        const parentPath = command.commandPath.slice(0, -1).join(' ');
        const commandName = command.commandPath[command.commandPath.length - 1];
        const parentVar = parentPath ? commandMap.get(parentPath) : 'program';
        const newCommandVar = `cmd_${commandPath.replace(/\\s+/g, '_')}`;

        registrations.push(`// Register command: ${commandPath}`);
        registrations.push(
          `const ${newCommandVar} = ${parentVar || 'program'}.command('${commandName}');`,
        );

        registrations.push(`if (typeof ${commandVar} === 'function') {`);
        registrations.push(`  const config = ${commandVar}();`);
        registrations.push(`  if (config.description) {`);
        registrations.push(
          `    ${newCommandVar}.description(config.description);`,
        );
        registrations.push(`  }`);
        registrations.push(`  if (config.alias) {`);
        registrations.push(
          `    const aliases = Array.isArray(config.alias) ? config.alias : [config.alias];`,
        );
        registrations.push(
          `    aliases.forEach(a => ${newCommandVar}.alias(a));`,
        );
        registrations.push(`  }`);
        registrations.push(`  if (config.options) {`);
        registrations.push(`    config.options.forEach(opt => {`);
        registrations.push(
          `      ${newCommandVar}.option(opt.flags, opt.description, opt.defaultValue);`,
        );
        registrations.push(`    });`);
        registrations.push(`  }`);
        registrations.push(`  if (config.arguments) {`);
        registrations.push(`    config.arguments.forEach(arg => {`);
        registrations.push(
          `      const argStr = arg.variadic ? \`<\${arg.name}...>\` : arg.required ? \`<\${arg.name}>\` : \`[\${arg.name}]\`;`,
        );
        registrations.push(
          `      ${newCommandVar}.argument(argStr, arg.description);`,
        );
        registrations.push(`    });`);
        registrations.push(`  }`);
        registrations.push(`  if (config.action) {`);
        registrations.push(getCommanderActionContent(newCommandVar, 'config'));
        registrations.push(`  }`);
        registrations.push(
          `} else if (${commandVar} && ${commandVar}.action) {`,
        );
        registrations.push(`  if (${commandVar}.description) {`);
        registrations.push(
          `    ${newCommandVar}.description(${commandVar}.description);`,
        );
        registrations.push(`  }`);
        registrations.push(`  if (${commandVar}.alias) {`);
        registrations.push(
          `    const aliases = Array.isArray(${commandVar}.alias) ? ${commandVar}.alias : [${commandVar}.alias];`,
        );
        registrations.push(
          `    aliases.forEach(a => ${newCommandVar}.alias(a));`,
        );
        registrations.push(`  }`);
        registrations.push(`  if (${commandVar}.options) {`);
        registrations.push(`    ${commandVar}.options.forEach(opt => {`);
        registrations.push(
          `      ${newCommandVar}.option(opt.flags, opt.description, opt.defaultValue);`,
        );
        registrations.push(`    });`);
        registrations.push(`  }`);
        registrations.push(`  if (${commandVar}.arguments) {`);
        registrations.push(`    ${commandVar}.arguments.forEach(arg => {`);
        registrations.push(
          `      const argStr = arg.variadic ? \`<\${arg.name}...>\` : arg.required ? \`<\${arg.name}>\` : \`[\${arg.name}]\`;`,
        );
        registrations.push(
          `      ${newCommandVar}.argument(argStr, arg.description);`,
        );
        registrations.push(`    });`);
        registrations.push(`  }`);
        registrations.push(
          getCommanderActionContent(newCommandVar, commandVar),
        );
        registrations.push(`}`);
        registrations.push(``);

        commandMap.set(commandPath, newCommandVar);
      }
    }
  }

  registrations.push(`// Parse command line arguments`);
  registrations.push(`program.parse(process.argv);`);

  return registrations.join('\n');
};

const getDefaultTemplate = () => {
  return `
{{IMPORTS}}

// Generated CLI code
{{REGISTRATIONS}}
`;
};

export const writeCLI = (code: string, config: BuildConfig) => {
  const tempDir = path.resolve(process.cwd(), '.temp');
  const outDir = path.resolve(process.cwd(), config.outDir || './dist/cli');
  const isTypeScript = config.typescript !== false;
  const ext = isTypeScript ? '.ts' : '.js';
  const outFile = path.join(outDir, `index.cjs`);
  const tempFile = path.join(tempDir, `index${ext}`);

  fs.ensureDirSync(tempDir);
  fs.writeFileSync(tempFile, code, 'utf-8');
  spawnSync(
    'npx',
    [
      '-y',
      'esbuild',
      tempFile,
      '--bundle',
      `--outfile=${outFile}`,
      '--platform=node',
      config.minify === false ? '' : '--minify',
    ].filter(Boolean),
  );
  fs.rmSync(tempDir, {
    recursive: true,
  });
  const content = fs.readFileSync(outFile, 'utf-8');
  fs.writeFileSync(outFile, `#!/usr/bin/env node\n\n${content}`, 'utf-8');

  if (process.platform !== 'win32') {
    fs.chmodSync(outFile, '755');
  }

  return outFile;
};

export const generateBinField = (config: BuildConfig) => {
  const binPath = path.join(config.outDir || './dist/cli', 'index.cjs');
  return {
    [config.binName]: binPath,
  };
};
