import path from 'node:path';
import fs from 'fs-extra';
import { glob } from 'glob';
import type { BuildConfig, ScannedCommand } from '..';

export const scanCommands = async (
  config: BuildConfig,
): Promise<ScannedCommand[]> => {
  const commandsDir = path.resolve(
    process.cwd(),
    config.commandsDir || './src/commands',
  );

  if (!(await fs.pathExists(commandsDir))) {
    throw new Error(`Commands directory not found: ${commandsDir}`);
  }

  const patterns = [
    '**/*.ts',
    '**/*.js',
    '!**/*.d.ts',
    '!**/*.test.*',
    '!**/*.spec.*',
  ];

  const files = await glob(patterns, {
    cwd: commandsDir,
    absolute: false,
    ignore: ['node_modules/**', '**/__tests__/**', '**/test/**'],
  });

  const commands: ScannedCommand[] = [];

  for (const file of files) {
    const fullPath = path.join(commandsDir, file);
    const relativePath = file;

    const parsedPath = path.parse(relativePath);
    const pathParts = parsedPath.dir ? parsedPath.dir.split(path.sep) : [];
    const isIndex = parsedPath.name === 'index';

    const commandPath: string[] = [];

    if (!isIndex) {
      commandPath.push(...pathParts, parsedPath.name);
    } else {
      commandPath.push(...pathParts);
    }

    const filteredPath = commandPath.filter((p) => p !== '');

    commands.push({
      path: fullPath,
      relativePath,
      commandPath: filteredPath,
      isIndex,
    });
  }

  commands.sort((a, b) => {
    if (a.commandPath.length !== b.commandPath.length) {
      return a.commandPath.length - b.commandPath.length;
    }
    if (a.isIndex !== b.isIndex) {
      return a.isIndex ? -1 : 1;
    }
    return a.relativePath.localeCompare(b.relativePath);
  });

  return commands;
};

export const validateCommands = (commands: ScannedCommand[]): void => {
  const commandMap = new Map<string, ScannedCommand>();

  for (const command of commands) {
    const key = command.commandPath.join(' ');

    if (commandMap.has(key)) {
      const existing = commandMap.get(key) as ScannedCommand;
      throw new Error(
        `Command conflict detected:\n` +
          `  - ${existing.relativePath}\n` +
          `  - ${command.relativePath}\n` +
          `Both files map to command: ${key || '<root>'}`,
      );
    }

    commandMap.set(key, command);
  }
};

export const groupCommandsByParent = (
  commands: ScannedCommand[],
): Map<string, ScannedCommand[]> => {
  const groups = new Map<string, ScannedCommand[]>();

  for (const command of commands) {
    const parentPath = command.commandPath.slice(0, -1).join(' ');

    if (!groups.has(parentPath)) {
      groups.set(parentPath, []);
    }

    (groups.get(parentPath) as ScannedCommand[]).push(command);
  }

  return groups;
};

export const extractCommandMetadata = async (filePath: string) => {
  const content = await fs.readFile(filePath, 'utf-8');

  const exportDefaultMatch = content.match(
    /export\s+default\s+(?:defineCommand\s*\()?\s*({[\s\S]*?})\s*\)?/,
  );
  const moduleExportsMatch = content.match(
    /module\.exports\s*=\s*(?:defineCommand\s*\()?\s*({[\s\S]*?})\s*\)?/,
  );

  if (exportDefaultMatch || moduleExportsMatch) {
    const match = exportDefaultMatch || moduleExportsMatch;
    try {
      return match?.[1];
    } catch (error) {
      console.warn(`Failed to parse command metadata from ${filePath}:`, error);
    }
  }

  return null;
};
