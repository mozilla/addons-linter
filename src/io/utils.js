import { lstat, readdir } from 'fs';
import * as path from 'path';

import promisify from 'es6-promisify';
import upath from 'upath';

import log from 'logger';

export const lstatPromise = promisify(lstat);
export const readdirPromise = promisify(readdir);

export function walkPromise(curPath, { shouldIncludePath = () => true } = {}) {
  const result = {};
  // Set a basePath var with the initial path
  // so all file paths (the result keys) can
  // be relative to the starting point.
  const basePath = curPath;

  return (function walk(_curPath) {
    return lstatPromise(_curPath)
      // eslint-disable-next-line consistent-return
      .then((stat) => {
        // Convert the filename into the unix path separator
        // before storing it into the scanned files map.
        const relPath = upath.toUnix(path.relative(basePath, _curPath));

        if (!shouldIncludePath(relPath, stat.isDirectory())) {
          log.debug(`Skipping file path: ${relPath}`);
          return result;
        } else if (stat.isFile()) {
          const { size } = stat;
          result[relPath] = { size };
        } else if (stat.isDirectory()) {
          return readdirPromise(_curPath)
            .then((files) => {
              // Map the list of files and make a list of readdir
              // promises to pass to Promise.all so we can recursively
              // get the data on all the files in the directory.
              return Promise.all(files.map((fileName) => {
                return walk(path.join(_curPath, fileName));
              }));
            })
            .then(() => {
              return result;
            });
        }
      });
  }(curPath));
}
