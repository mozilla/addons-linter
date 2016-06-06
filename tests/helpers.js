import fs from 'fs';
import { Readable } from 'stream';

import { PACKAGE_EXTENSION } from 'const';
import { singleLineString } from 'utils';


export const fakeMessageData = {
  code: 'WHATEVER_CODE',
  description: 'description',
  message: 'message',
};

export function getRuleFiles(ruleType) {
  var ruleFiles = fs.readdirSync(`src/rules/${ruleType}`);

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
  var variable = null;
  scope.variables.some(function(v) {
    if (v.name === name) {
      variable = v;
      return true;
    }
    return false;
  });
  return variable;
}

export function metadataPassCheck(contents, filename, {addonMetadata=null}={}) {
  if (!addonMetadata || typeof addonMetadata.guid === 'undefined') {
    assert.fail(null, null, 'Add-on metadata not found');
  }

  return [];
}

export function validChromeManifest(contents=[
  'category JavaScript-DOM-class foo bar',
  'category JavaScript-DOM-interface foo bar',
], {includeBoilerplate=true}={}) {
  var rstream = new Readable();
  if (includeBoilerplate === true) {
    rstream.push('content  necko   jar:comm.jar!/content/necko/\n');
  }

  contents.forEach((line) => {
    rstream.push(`${line}\n`);
  });

  rstream.push(null);

  return rstream;
}

export function validHTML(contents='') {
  return singleLineString`<!DOCTYPE html>
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

export function validMetadata(metadata={}) {
  return Object.assign({}, {
    type: PACKAGE_EXTENSION,
  }, metadata);
}

export function validRDF(contents) {
  return singleLineString`<?xml version='1.0' encoding='utf-8'?>
  <RDF xmlns="http://www.w3.org/1999/02/22-rdf-syntax-ns#"
       xmlns:em="http://www.mozilla.org/2004/em-rdf#">
    <Description about="urn:mozilla:install-manifest">
      ${contents}
    </Description>
  </RDF>`;
}

export function validManifestJSON(extra) {
  return JSON.stringify(Object.assign({}, {
    name: 'my extension',
    manifest_version: 2,
    applications: {
      gecko: {
        id: '{daf44bf7-a45e-4450-979c-91cf07434c3d}',
        strict_min_version: '40.0.0',
        strict_max_version: '50.*',
      },
    },
    version: '0.1',
  }, extra));
}

export function unexpectedSuccess() {
  return assert.fail(null, null, 'Unexpected success');
}
