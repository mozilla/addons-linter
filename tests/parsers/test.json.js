import Linter from 'linter';
import JSONParser from 'parsers/json';

import * as messages from 'messages';
import { singleLineString } from 'utils';
import { validManifestJSON } from '../helpers';


describe('JSONParser', function() {

  it('should show a message if bad JSON', () => {
    var addonLinter = new Linter({_: ['bar']});
    var jsonParser = new JSONParser('blah', addonLinter.collector);
    jsonParser.parse();

    assert.equal(jsonParser.isValid, false);
    var errors = addonLinter.collector.errors;
    assert.equal(errors.length, 1);
    assert.equal(errors[0].code, messages.JSON_INVALID.code);
    assert.include(errors[0].message, 'Your JSON is not valid.');
    assert.include(errors[0].description, 'Unexpected token b');
  });

});

describe('JSONParser duplicate keys', function() {

  it('should error if duplicate keys are found in a JSON file', () => {
    var addonLinter = new Linter({_: ['bar']});
    // We aren't using singleLineString here so we can test the line number
    // reporting.
    /* eslint-disable indent */
    var json = ['{',
      '"description": "Very good music.",',
      '"manifest_version": 2,',
      '"name": "Prince",',
      '"version": "0.0.1",',
      '"name": "The Artist Formerly Known As Prince",',
      '"applications": {',
          '"gecko": {',
              '"id": "@webextension-guid"',
          '}',
      '}',
    '}'].join('\n');
    /* eslint-enable indent */

    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse();

    assert.equal(jsonParser.isValid, false);
    var errors = addonLinter.collector.errors;
    assert.lengthOf(errors, 1);
    assert.equal(errors[0].code, messages.JSON_DUPLICATE_KEY.code);
    assert.include(errors[0].message, 'Duplicate keys are not allowed');
    assert.equal(errors[0].line, 6);
    assert.include(errors[0].description, 'Duplicate key: name found');
  });

  it('should report all dupes if multiple duplicate keys are found', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = singleLineString`{
      "description": "Very good music.",
      "manifest_version": 2,
      "name": "Prince",
      "name": "Male Symbol",
      "version": "0.0.1",
      "version": "0.0.2",
      "name": "The Artist Formerly Known As Prince",
      "applications": {
          "gecko": {
              "id": "@webextension-guid"
          }
      }
    }`;

    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse();

    assert.equal(jsonParser.isValid, false);
    var errors = addonLinter.collector.errors;
    assert.lengthOf(errors, 3);
    assert.equal(errors[0].code, messages.JSON_DUPLICATE_KEY.code);
    // We expect the duplicate error messages to be in the order of the
    // dupliate keys in the manifest.
    assert.include(errors[0].message, 'Duplicate keys are not allowed');
    assert.include(errors[0].description, 'Duplicate key: name found');
    assert.include(errors[1].description, 'Duplicate key: version found');
    assert.include(errors[2].description, 'Duplicate key: name found');
  });

  it('should not expose other RJSON errors', () => {
    var addonLinter = new Linter({_: ['bar']});
    // We aren't using singleLineString here so we can test the line number
    // reporting.
    /* eslint-disable indent */
    var json = ['{',
      '"description": "Very good music.",',
      '"manifest_version": 2,',
      '"name": "Prince",',
      '"version": "0.0.1",',
      '"applications": {',
          '"gecko": {',
              '"id": "@webextension-guid"',
          '}',
      '}',
    '}'].join('\n');
    /* eslint-enable indent */
    var fakeRJSON = { parse: () => {} };
    var parseStub = sinon.stub(fakeRJSON, 'parse', () => {
      throw {
        warnings: [
          {
            line: 1,
            message: 'Duplicate key: not actually found but this is a test',
          },
          {
            line: 1,
            message: 'DifferentError: Who cares',
          },
        ],
      };
    });

    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse(fakeRJSON);

    assert.equal(jsonParser.isValid, false);
    assert.ok(parseStub.called);
    var errors = addonLinter.collector.errors;
    assert.lengthOf(errors, 1);
    assert.equal(errors[0].code, messages.JSON_DUPLICATE_KEY.code);
    assert.include(errors[0].message, 'Duplicate keys are not allowed');
    assert.equal(errors[0].line, 1);
    assert.include(errors[0].description,
                   'Duplicate key: not actually found but this is a test');
  });

  it('should not be invalid if unknown RJSON errors', () => {
    var addonLinter = new Linter({_: ['bar']});
    // We aren't using singleLineString here so we can test the line number
    // reporting.
    var json = '{}';

    var fakeRJSON = { parse: () => {} };
    var parseStub = sinon.stub(fakeRJSON, 'parse', () => {
      throw {
        warnings: [
          {
            line: 1,
            message: 'DifferentError: Who cares',
          },
        ],
      };
    });

    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse(fakeRJSON);

    // If RJSON throws an error we don't recognise, we should ignore it and
    // continue on like the JSON is valid. Regular parsing errors will be
    // picked up earlier in the process.
    assert.equal(jsonParser.isValid, true);
    assert.ok(parseStub.called);
    var errors = addonLinter.collector.errors;
    assert.lengthOf(errors, 0);
  });
});

describe('JSONParser with comments', function() {

  it('parses JSON', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = `// I am a JSON comment, sigh\n${validManifestJSON()}`;
    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse();

    assert.equal(jsonParser.isValid, true);
  });

  // Chrome will accept multiline /* */ comments, but Firefox will not and
  // the Web Extension spec does not allow them. So we will error on them.
  it('does not parse JSON with a multiline comment', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = `/* I am a JSON comment, sigh*/\n${validManifestJSON()}`;
    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse();

    assert.equal(jsonParser.isValid, false);
    var errors = addonLinter.collector.errors;
    // There should not be another error; a file with block-level comments
    // will throw that specific error and not a parse error.
    assert.lengthOf(errors, 1);
    assert.equal(errors[0].code, messages.JSON_BLOCK_COMMENTS.code);
    assert.equal(errors[0].message, messages.JSON_BLOCK_COMMENTS.message);
  });

  it('parses the example from Chrome developer docs', () => {
    var addonLinter = new Linter({_: ['bar']});
    // Example from https://developer.chrome.com/extensions/manifest
    var json = [
      '{',
      '// Required',
      '"manifest_version": 2,',
      '"name": "My Extension",',
      '// Make the hell sure to use semvar.org if increasing this',
      '"version": "0.0.1"',
      '}',
    ].join('\n');
    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse();

    assert.equal(jsonParser.isValid, true);
    assert.notInclude(jsonParser._jsonString, 'semvar.org');
  });

  it('returns the correct error for malformed JSON', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = `{"something": true,\n// I am a JSON comment, sigh\nblah}`;
    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse();

    assert.equal(jsonParser.isValid, false);
    var errors = addonLinter.collector.errors;
    assert.equal(errors[0].code, messages.JSON_INVALID.code);
    assert.include(errors[0].message, 'Your JSON is not valid.');
  });

  it("doesn't evaluate JS code in comments", () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = '// eval("");\n{"something": true}\nvar bla = "foo";';
    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse();

    assert.equal(jsonParser.isValid, false);
    var errors = addonLinter.collector.errors;
    assert.equal(errors[0].code, messages.JSON_INVALID.code);
    assert.include(errors[0].message, 'Your JSON is not valid.');
    assert.notInclude(jsonParser._jsonString, 'var bla');
    assert.notInclude(jsonParser._jsonString, 'eval');
  });

  it("doesn't evaluate JS code even though esprima is used", () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = [
      '{',
      '// Required',
      '"manifest_version": 2,',
      '"name": "My Extension",',
      '// Make the hell sure to use semvar.org if increasing this',
      '"version": eval("alert(\'uh-oh\')")',
      '}',
    ].join('\n');
    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse();

    assert.equal(jsonParser.isValid, false);
    var errors = addonLinter.collector.errors;
    assert.equal(errors[0].code, messages.JSON_INVALID.code);
    assert.include(errors[0].message, 'Your JSON is not valid.');
  });
});
