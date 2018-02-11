import fs from 'fs';
import { Readable, Stream } from 'stream';
import { assert } from 'assert';

import isMatchWith from 'lodash.ismatchwith';
import Hash from 'hashish';
import { oneLine } from 'common-tags';

import { PACKAGE_EXTENSION } from 'const';


export const fakeMessageData = {
  code: 'WHATEVER_CODE',
  description: 'description',
  message: 'message',
};

export const EMPTY_PNG = Buffer
  .from(oneLine`iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMA
                AQAABQABDQottAAAAABJRU5ErkJggg==`,
    'base64');

export function getRuleFiles(ruleType) {
  const ruleFiles = fs.readdirSync(`src/rules/${ruleType}`);

  return ruleFiles.filter((value) => {
    return value !== 'index.js';
  });
}

/**
 * Get variables in the current escope
 * @param {object} scope current scope
 * @param {string} name name of the variable to look for
 * @returns {ASTNode} The variable object
 *
 * Copied from ESLint tests; used to test {allowInlineConfig: false} settings.
 */
export function getVariable(scope, name) {
  let variable = null;
  scope.variables.some((v) => {
    if (v.name === name) {
      variable = v;
      return true;
    }
    return false;
  });
  return variable;
}

export function metadataPassCheck(contents, filename, { addonMetadata = null } = {}) {
  if (!addonMetadata || typeof addonMetadata.guid === 'undefined') {
    assert.fail(null, null, 'Add-on metadata not found');
  }

  return [];
}

export function validHTML(contents = '') {
  return oneLine`<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <title>A little Add-on</title>
    </head>
    <body>
      ${contents}
    </body>
  </html>`;
}

export function validMetadata(metadata = {}) {
  return Object.assign({}, {
    type: PACKAGE_EXTENSION,
  }, metadata);
}

export function validManifestJSON(extra) {
  return JSON.stringify(Object.assign({}, {
    name: 'my extension',
    manifest_version: 2,
    applications: {
      gecko: {
        id: '{daf44bf7-a45e-4450-979c-91cf07434c3d}',
        strict_min_version: '40.0.0',
      },
    },
    version: '0.1',
  }, extra));
}

export function validLangpackManifestJSON(extra) {
  return JSON.stringify(Object.assign({}, {
    manifest_version: 2,
    name: 'My Language Pack',
    version: '57.0a1',
    langpack_id: 'de',
    languages: {
      de: {
        chrome_resources: {},
        version: '57.0a1',
      },
    },
  }, extra));
}

export function validLocaleMessagesJSON() {
  return JSON.stringify(Object.assign({}, {
    foo: {
      message: 'bar',
    },
    Placeh0lder_Test: {
      message: '$foo$ bar $BA2$',
      placeholders: {
        foo: {
          content: '$1',
          example: 'FOO',
        },
        BA2: {
          content: 'baz',
        },
      },
    },
  }));
}

export function unexpectedSuccess() {
  return assert.fail(null, null, 'Unexpected success');
}

function isMatch(target, expected) {
  return isMatchWith(target, expected, (tVal, eVal) => {
    if (eVal instanceof RegExp) {
      return eVal.test(tVal);
    }
    // Returning undefined will use the default comparison.
    return undefined;
  });
}

export function assertHasMatchingError(errors, expected) {
  expect(Array.isArray(errors)).toBe(true);
  expect(errors.length).toBeGreaterThan(0);
  expect(errors.some((error) => isMatch(error, expected))).toBe(true);
}

export function getStreamableIO(files) {
  return {
    files,
    getFiles: () => {
      return Promise.resolve(files);
    },
    getFileAsStream: (path) => {
      if (files[path] instanceof Stream &&
          typeof files[path]._read === 'function' &&
          typeof files[path]._readableState === 'object') {
        return Promise.resolve(files[path]);
      }

      const stream = new Readable();
      stream.push(files[path]);
      stream.push(null);
      return Promise.resolve(stream);
    },
  };
}

/* `checkOutput` is copied and modified directly from yargs test helpers */
// eslint-disable-next-line consistent-return
export function checkOutput(func, argv, callback) {
  /* eslint-disable func-names */
  let exitCode = null;
  const _exit = process.exit;
  const _emit = process.emit;
  const _env = process.env;
  const _argv = process.argv;
  var _error = console.error; // eslint-disable-line
  var _log = console.log; // eslint-disable-line
  var _warn = console.warn; // eslint-disable-line

  process.exit = function(code) { exitCode = code; };
  process.env = Hash.merge(process.env, { _: 'node' });
  process.argv = argv || ['./usage'];

  const errors = [];
  const logs = [];
  const warnings = [];

  console.error = function(msg) { errors.push(msg); }; // eslint-disable-line
  console.log = function(msg) { logs.push(msg); }; // eslint-disable-line
  console.warn = function(msg) { warnings.push(msg); }; // eslint-disable-line

  let result;

  function reset() {
    process.exit = _exit;
    process.emit = _emit;
    process.env = _env;
    process.argv = _argv;

    console.error = _error; // eslint-disable-line
    console.log = _log; // eslint-disable-line
    console.warn = _warn; // eslint-disable-line
  }

  function done() {
    reset();

    return {
      errors,
      logs,
      warnings,
      exitCode,
      result,
    };
  }

  if (typeof cb === 'function') {
    process.exit = function(code) {
      exitCode = code;
      callback(null, done());
    };

    process.emit = function(ev, value) {
      if (ev === 'uncaughtException') {
        done();
        callback(value);
        return true;
      }

      // eslint-disable-next-line prefer-rest-params
      return _emit.apply(this, arguments);
    };

    func();
  } else {
    try {
      result = func();
    } finally {
      reset();
    }

    return done();
  }
}

export function readStringFromStream(readStream, transform) {
  return new Promise((resolve, reject) => {
    let content = '';
    readStream.on('readable', () => {
      let chunk;
      // eslint-disable-next-line no-cond-assign
      while ((chunk = readStream.read()) !== null) {
        content += chunk.toString(transform);
      }
    });
    readStream.on('end', () => {
      resolve(content);
    });
    readStream.on('error', reject);
  });
}
