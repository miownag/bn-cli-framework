import { exec } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import fs from 'fs-extra';

const execAsync = promisify(exec);

const getPackageJSON = (): Promise<Record<string, any>> =>
  fs.readJSON(path.join(process.cwd(), 'package.json'));

const getBinName = async () => {
  const packageJson = await getPackageJSON();
  return Object.keys(packageJson.bin)[0];
};

const queryLatestVersions = async (packageNames: string[]) => {
  return Promise.allSettled(
    packageNames.map((packageName) =>
      execAsync(`npm info ${packageName} version`),
    ),
  ).then((results) => {
    return results.map((result) => {
      if (result.status === 'fulfilled') {
        return result.value.stdout.trim();
      }
      return null;
    });
  });
};

export { execAsync, getPackageJSON, getBinName, queryLatestVersions };
