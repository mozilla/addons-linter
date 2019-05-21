import { lstat, readdir } from 'fs';
import * as path from 'path';

import { promisify } from 'es6-promisify';
import upath from 'upath';

import log from 'linter/logger';

export const lstatPromise = promisify(lstat);
export const readdirPromise = promisify(readdir);

export function walkPromise(curPath, { shouldIncludePath = () => true } = {}) {
  const result = {};
  // Set a basePath var with the initial path
  // so all file paths (the result keys) can
  // be relative to the starting point.
  const basePath = curPath;
  const walk = async function walk(_curPath) {
    const stat = await lstatPromise(_curPath);
    const relPath = upath.toUnix(path.relative(basePath, _curPath));

    if (!shouldIncludePath(relPath, stat.isDirectory())) {
      log.debug(`Skipping file path: ${relPath}`);
    } else if (stat.isFile()) {
      const { size } = stat;
      result[relPath] = { size };
    } else if (stat.isDirectory()) {
      const files = await readdirPromise(_curPath);

      // Map the list of files and make a list of readdir
      // promises to pass to Promise.all so we can recursively
      // get the data on all the files in the directory.
      await Promise.all(
        files.map(async (fileName) => {
          await walk(path.join(_curPath, fileName));
        })
      );
    }
    return result;
  };
  return walk(curPath);
}
