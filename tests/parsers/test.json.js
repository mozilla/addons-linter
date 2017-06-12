import Linter from 'linter';
import JSONParser from 'parsers/json';
import sinon from 'sinon';

import * as messages from 'messages';
import { singleLineString } from 'utils';
import { validManifestJSON } from '../helpers';


describe('JSONParser', function() {

  it('should show a message if bad JSON', () => {
    var addonLinter = new Linter({_: ['bar']});
    var jsonParser = new JSONParser('blah', addonLinter.collector);
    jsonParser.parse();

    expect(jsonParser.isValid).toEqual(false);
    var errors = addonLinter.collector.errors;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.JSON_INVALID.code);
    expect(errors[0].message).toContain('Your JSON is not valid.');
    expect(errors[0].description).toContain('Unexpected token b');
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

    expect(jsonParser.isValid).toEqual(false);
    var errors = addonLinter.collector.errors;
    expect(errors.length).toBe(1);
    expect(errors[0].code).toEqual(messages.JSON_DUPLICATE_KEY.code);
    expect(errors[0].message).toContain('Duplicate keys are not allowed');
    expect(errors[0].line).toEqual(6);
    expect(errors[0].description).toContain('Duplicate key: name found');
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

    expect(jsonParser.isValid).toEqual(false);
    var errors = addonLinter.collector.errors;
    expect(errors.length).toBe(3);
    expect(errors[0].code).toEqual(messages.JSON_DUPLICATE_KEY.code);
    // We expect the duplicate error messages to be in the order of the
    // dupliate keys in the manifest.
    expect(errors[0].message).toContain('Duplicate keys are not allowed');
    expect(errors[0].description).toContain('Duplicate key: name found');
    expect(errors[1].description).toContain('Duplicate key: version found');
    expect(errors[2].description).toContain('Duplicate key: name found');
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
    var parseStub = sinon.stub(fakeRJSON, 'parse').callsFake(() => {
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

    expect(jsonParser.isValid).toEqual(false);
    expect(parseStub.called).toBeTruthy();
    var errors = addonLinter.collector.errors;
    expect(errors.length).toBe(1);
    expect(errors[0].code).toEqual(messages.JSON_DUPLICATE_KEY.code);
    expect(errors[0].message).toContain('Duplicate keys are not allowed');
    expect(errors[0].line).toEqual(1);
    expect(errors[0].description).toContain(
      'Duplicate key: not actually found but this is a test'
    );
  });

  it('should not be invalid if unknown RJSON errors', () => {
    var addonLinter = new Linter({_: ['bar']});
    // We aren't using singleLineString here so we can test the line number
    // reporting.
    var json = '{}';

    var fakeRJSON = { parse: () => {} };
    var parseStub = sinon.stub(fakeRJSON, 'parse').callsFake(() => {
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
    expect(jsonParser.isValid).toEqual(true);
    expect(parseStub.called).toBeTruthy();
    var errors = addonLinter.collector.errors;
    expect(errors.length).toBe(0);
  });
});

describe('JSONParser with comments', function() {

  it('parses JSON', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = `// I am a JSON comment, sigh\n${validManifestJSON()}`;
    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse();

    expect(jsonParser.isValid).toEqual(true);
  });

  // Chrome will accept multiline /* */ comments, but Firefox will not and
  // the Web Extension spec does not allow them. So we will error on them.
  it('does not parse JSON with a multiline comment', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = `/* I am a JSON comment, sigh*/\n${validManifestJSON()}`;
    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse();

    expect(jsonParser.isValid).toEqual(false);
    var errors = addonLinter.collector.errors;
    // There should not be another error; a file with block-level comments
    // will throw that specific error and not a parse error.
    expect(errors.length).toBe(1);
    expect(errors[0].code).toEqual(messages.JSON_BLOCK_COMMENTS.code);
    expect(errors[0].message).toEqual(messages.JSON_BLOCK_COMMENTS.message);
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

    expect(jsonParser.isValid).toEqual(true);
    expect(jsonParser._jsonString).not.toContain('semvar.org');
  });

  it('returns the correct error for malformed JSON', () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = '{"something": true,\n// I am a JSON comment, sigh\nblah}';
    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse();

    expect(jsonParser.isValid).toEqual(false);
    var errors = addonLinter.collector.errors;
    expect(errors[0].code).toEqual(messages.JSON_INVALID.code);
    expect(errors[0].message).toContain('Your JSON is not valid.');
  });

  it("doesn't evaluate JS code in comments", () => {
    var addonLinter = new Linter({_: ['bar']});
    var json = '// eval("");\n{"something": true}\nvar bla = "foo";';
    var jsonParser = new JSONParser(json, addonLinter.collector);
    jsonParser.parse();

    expect(jsonParser.isValid).toEqual(false);
    var errors = addonLinter.collector.errors;
    expect(errors[0].code).toEqual(messages.JSON_INVALID.code);
    expect(errors[0].message).toContain('Your JSON is not valid.');
    expect(jsonParser._jsonString).not.toContain('var bla');
    expect(jsonParser._jsonString).not.toContain('eval');
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

    expect(jsonParser.isValid).toEqual(false);
    var errors = addonLinter.collector.errors;
    expect(errors[0].code).toEqual(messages.JSON_INVALID.code);
    expect(errors[0].message).toContain('Your JSON is not valid.');
  });
});
