import semver from 'semver';
import { PACKAGE_TYPES } from 'const';

/*
 * Template tag for removing whitespace and new lines
 * in order to be able to use multiline template strings
 * as a single string.
 *
 * Usage: singleLineString`foo bar baz
 *                    whatever`;
 *
 * Will output: 'foo bar baz whatever'
 *
 */
export function singleLineString(strings, ...vars) {
  // Interweave the strings with the
  // substitution vars first.
  let output = '';
  for (let i = 0; i < vars.length; i++) {
    output += strings[i] + vars[i];
  }
  output += strings[vars.length];

  // Split on newlines.
  let lines = output.split(/(?:\r\n|\n|\r)/);

  // Rip out the leading whitespace.
  return lines.map((line) => {
    return line.replace(/^\s+/gm, '');
  }).join(' ').trim();
}

/*
 * Gettext utils. No-op until we have proper
 * a proper l10n solution.
 *
 */
export function gettext(str) {
  return str;
}


/*
 * Check the minimum node version is met
 */
export function checkMinNodeVersion(minVersion, _process=process) {
  return new Promise((resolve, reject) => {
    minVersion = minVersion || '0.12.0';
    if (!semver.gte(_process.version, minVersion)) {
      reject(new Error(singleLineString`Node version must be ${minVersion} or
                       greater. You are using ${_process.version}.`));
    } else {
      resolve();
    }
  });
}


export function getPackageTypeAsString(numericPackageType) {
  for (let packageType of Object.keys(PACKAGE_TYPES)) {
    if (parseInt(numericPackageType, 10) === PACKAGE_TYPES[packageType]) {
      return packageType;
    }
  }
  throw new Error(`Invalid package type constant "${numericPackageType}"`);
}

/*
 * Looks through all exported functions and returns only
 * "public" *functions* that aren't prefixed with an _
 *
 * Used for ignoring private functions and constants in rules files.
 * Rules can have private functions we don't run; anything that
 * starts with an "_" shouldn't be returned.
 *
 * This exists because we export private functions in rule files
 * for testing.
 */
export function ignorePrivateFunctions(list) {
  var filteredList = {};

  for (let functionName in list) {
    if (functionName.startsWith('_') === false &&
        typeof(list[functionName]) === 'function') {
      filteredList[functionName] = list[functionName];
    }
  }

  return filteredList;
}
