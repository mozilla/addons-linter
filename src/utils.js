import url from 'url';

import semver from 'semver';
import { PACKAGE_TYPES, LOCAL_PROTOCOLS } from 'const';

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
 * Get a variable from a eslint context object if it exists, otherwise
 * undefined.
 */
export function getVariable(context, name) {
  var variables = context.getScope().variables;
  var result;
  variables.forEach(function(variable) {
    if (variable.name === name) {
      result = variable.defs[0].name.parent.init;
    }
  });
  return result;
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


export function isLocalUrl(urlInput) {
  var parsedUrl = url.parse(urlInput);
  var protocol = parsedUrl.protocol;
  var path = parsedUrl.path;
  // Check protocol is chrome: or resource: if set.
  // Details on the chrome protocol are here: https://goo.gl/W52T0Q
  // Details on resource protocol are here: https://goo.gl/HHqeJA
  if (protocol && LOCAL_PROTOCOLS.indexOf(protocol) === -1) {
    return false;
  }
  // Disallow protocol-free remote urls.
  if (path.startsWith('//')) {
    return false;
  }
  return true;
}


export function extractCSSUri(cssUrl) {
  var match = cssUrl.match(/^url\(\s*['"]?(.*?)['"]?\s*\)$/i);
  if (match === null || !match[1] || match[0] !== cssUrl) {
    throw new Error(`CSS url() "${cssUrl}" is invalid`);
  }
  return match[1].trim();
}


export function isLocalCSSUri(cssUri) {
  var cssUriValue = extractCSSUri(cssUri);
  return isLocalUrl(cssUriValue);
}
