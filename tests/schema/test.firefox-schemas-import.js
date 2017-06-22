import fs from 'fs';
import path from 'path';
import stream from 'stream';

import request from 'request';
import tar from 'tar';

import {
  FLAG_PATTERN_REWRITES,
  downloadUrl,
  fetchSchemas,
  filterSchemas,
  foldSchemas,
  ignoredSchemas,
  importSchemas,
  inner,
  loadTypes,
  processSchemas,
  refMap,
  rewriteExtend,
  rewriteKey,
  rewriteOptionalToRequired,
  rewriteValue,
  stripTrailingNullByte,
} from 'schema/firefox-schemas-import';

// Get a reference to unlinkSync so it won't get stubbed later.
const { unlinkSync } = fs;

describe('firefox schema import', () => {
  let sandbox;

  function createDir(dirPath) {
    fs.mkdirSync(dirPath);
  }

  function removeDir(dirPath) {
    fs.readdirSync(dirPath).forEach(
      (file) => unlinkSync(path.join(dirPath, file)));
    fs.rmdirSync(dirPath);
  }

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('rewriteOptionalToRequired', () => {
    it('handles non-objects ', () => {
      const obj = {
        foo: 'FOO',
        bar: 10,
        baz: ['baz', 'BAZ'],
        required: [],
      };
      expect(rewriteOptionalToRequired(obj)).toEqual(obj);
    });

    it('converts optional to required', () => {
      const obj = {
        foo: { type: 'string', optional: true },
        bar: { type: 'array', optional: false },
        baz: { type: 'boolean' },
      };
      expect(rewriteOptionalToRequired(obj)).toEqual({
        foo: { type: 'string' },
        bar: { type: 'array' },
        baz: { type: 'boolean' },
        required: ['bar', 'baz'],
      });
    });

    it('removes optional when everything is optional', () => {
      const obj = {
        foo: { type: 'string', optional: true },
        bar: { type: 'array', optional: true },
        baz: { type: 'boolean', optional: true },
      };
      expect(rewriteOptionalToRequired(obj)).toEqual({
        foo: { type: 'string' },
        bar: { type: 'array' },
        baz: { type: 'boolean' },
        required: [],
      });
    });

    it('handles an allOf with one nested schema being optional', () => {
      const obj = {
        foo: { type: 'string', optional: true },
        bar: {
          allOf: [
            { $ref: '#/types/Whatever' },
            { optional: true, description: 'a thing' },
          ],
        },
        baz: { type: 'boolean' },
      };
      expect(rewriteOptionalToRequired(obj)).toEqual({
        foo: { type: 'string' },
        bar: {
          allOf: [
            { $ref: '#/types/Whatever' },
            { description: 'a thing' },
          ],
        },
        baz: { type: 'boolean' },
        required: ['baz'],
      });
    });

    it('handles an allOf with no nested schemas being optional', () => {
      const obj = {
        foo: { type: 'string', optional: true },
        bar: {
          allOf: [
            { $ref: '#/types/Whatever' },
            { type: 'string' },
          ],
        },
        baz: { type: 'boolean' },
      };
      expect(rewriteOptionalToRequired(obj)).toEqual({
        foo: { type: 'string' },
        bar: { allOf: [
          { $ref: '#/types/Whatever' },
          { type: 'string' },
        ]},
        baz: { type: 'boolean' },
        required: ['bar', 'baz'],
      });
    });
  });

  describe('rewriteValue', () => {
    it('adds required from optional', () => {
      const schema = {
        additionalProperties: true,
        properties: {
          foo: { type: 'string' },
          bar: { type: 'array', optional: true },
          baz: {
            type: 'object',
            properties: {
              abc: { type: 'string', optional: true },
              def: { type: 'array' },
            },
          },
        },
      };
      expect(rewriteValue('MyType', schema)).toEqual({
        additionalProperties: true,
        properties: {
          foo: { type: 'string' },
          bar: { type: 'array' },
          baz: {
            type: 'object',
            properties: {
              abc: { type: 'string' },
              def: { type: 'array' },
            },
            required: ['def'],
          },
        },
        required: ['foo', 'baz'],
      });
    });

    it('removes ids', () => {
      expect(rewriteValue('id', 'foo')).toEqual(undefined);
    });

    it('removes type: any', () => {
      expect(rewriteValue('type', 'any')).toEqual(undefined);
      expect(rewriteValue('type', 'string')).toEqual('string');
    });

    describe('pattern rewriting', () => {
      const originalPattern = '(?i)foo';

      beforeAll(() => {
        FLAG_PATTERN_REWRITES[originalPattern] = 'sup';
      });

      afterAll(() => {
        delete FLAG_PATTERN_REWRITES[originalPattern];
      });

      it('throws on an unknown pattern with flags', () => {
        expect(
          () => rewriteValue('pattern', '(?i)^abc$')
        ).toThrow('pattern (?i)^abc$ must be rewritten');
      });

      it('rewrites known patterns', () => {
        expect(rewriteValue('pattern', originalPattern)).toEqual('sup');
      });

      it('does not rewrite unknown patterns without flags', () => {
        expect(rewriteValue('pattern', 'abc(?i)def')).toEqual('abc(?i)def');
      });
    });

    it('updates $ref to JSON pointer', () => {
      expect(rewriteValue('$ref', 'Manifest')).toEqual('#/types/Manifest');
      expect(
        rewriteValue('$ref', 'extension_types.Timer')
      ).toEqual('extension_types#/types/Timer');
    });

    it("doesn't update $refs that have been updated already", () => {
      const $ref = 'manifest#/types/UnrecognizedProperty';
      expect(rewriteValue('$ref', $ref)).toBe($ref);
    });

    it('handles arrays', () => {
      const original = [{ type: 'string' }, { type: 'any' }, { $ref: 'Foo' }];
      expect(rewriteValue('anyOf', original)).toEqual(
        [{ type: 'string' }, {}, { $ref: '#/types/Foo' }]
      );
    });

    it('writes out a required when needed', () => {
      const original = {
        properties: {
          foo: { type: 'string', optional: true },
          bar: { type: 'number' },
        },
      };
      const expected = {
        properties: { foo: { type: 'string' }, bar: { type: 'number' } },
        required: ['bar'],
      };
      expect(rewriteValue('foo', original)).toEqual(expected);
    });

    it('omits required when it is empty', () => {
      const original = {
        properties: {
          foo: { type: 'string', optional: true },
          bar: { type: 'number', optional: true },
        },
      };
      const expected = {
        properties: { foo: { type: 'string' }, bar: { type: 'number' } },
      };
      expect(rewriteValue('foo', original)).toEqual(expected);
    });

    it('fixes $ref with other properties', () => {
      const original = {
        $ref: 'Foo',
        properties: {
          foo: { type: 'string', optional: true },
          bar: { type: 'string' },
        },
      };
      const expected = {
        allOf: [
          { $ref: '#/types/Foo' },
          {
            properties: { foo: { type: 'string' }, bar: { type: 'string' } },
            required: ['bar'],
          },
        ],
      };
      expect(rewriteValue('foo', original)).toEqual(expected);
    });

    it('leaves $ref objects that only have an extra optional property', () => {
      const original = { $ref: 'Foo', optional: true };
      const expected = { $ref: '#/types/Foo', optional: true };
      expect(rewriteValue('foo', original)).toEqual(expected);
    });

    it('strips UnrecognizedProperty in additionalProperties', () => {
      expect(
        rewriteValue('additionalProperties', { $ref: 'UnrecognizedProperty' })
      ).toEqual(undefined);
    });

    describe('known refs that are not specific', () => {
      beforeEach(() => { refMap.SomeType = 'manifest#/types/SomeType'; });
      afterEach(() => { delete refMap.SomeType; });

      it('get rewritten to good paths', () => {
        expect(rewriteValue('$ref', 'SomeType')).toEqual(
          'manifest#/types/SomeType'
        );
      });
    });
  });

  describe('rewriteKey', () => {
    it('rewrites choices to anyOf', () => {
      expect(rewriteKey('choices')).toEqual('anyOf');
    });

    it('leaves other values unchanged', () => {
      expect(rewriteKey('properties')).toEqual('properties');
    });
  });

  describe('rewriteObject', () => {
    it('rewrites keys and values', () => {
      const schema = {
        type: 'any',
        choices: [{ type: 'string' }, { type: 'number' }],
        isUndefined: undefined,
        keepMe: 'yay',
      };
      expect(inner.rewriteObject(schema)).toEqual(
        { anyOf: [{ type: 'string' }, { type: 'number' }], keepMe: 'yay' }
      );
    });
  });

  describe('loadTypes', () => {
    it('converts the types array to an object', () => {
      expect(loadTypes([
        { id: 'Foo', type: 'object' },
        { id: 'Bar', type: 'string' },
      ])).toEqual({
        Foo: { id: 'Foo', type: 'object' },
        Bar: { id: 'Bar', type: 'string' },
      });
    });

    it('handles there not being any types', () => {
      expect(loadTypes(undefined)).toEqual({});
    });
  });

  describe('normalizeSchema', () => {
    it('adds extend schemas as refs and definitions to last schema', () => {
      const schemas = [
        {
          namespace: 'manifest',
          types: [{
            $extend: 'WebExtensionManifest',
            choices: [
              { type: 'string', enum: ['cookies'] },
            ],
          }],
        },
        {
          namespace: 'cookies',
          types: [
            { id: 'Cookie', type: 'string' },
            { id: 'CookieJar', type: 'object' },
          ],
          somethingElse: 'foo',
        },
      ];
      expect(inner.normalizeSchema(schemas, 'cookies.json')).toEqual({
        id: 'cookies',
        types: {
          Cookie: { id: 'Cookie', type: 'string' },
          CookieJar: { id: 'CookieJar', type: 'object' },
        },
        somethingElse: 'foo',
        definitions: {
          WebExtensionManifest: {
            choices: [ { type: 'string', enum: ['cookies'] } ],
          },
        },
        refs: {
          'cookies#/definitions/WebExtensionManifest': {
            namespace: 'manifest',
            type: 'WebExtensionManifest',
          },
        },
      });
    });

    it('handles the manifest schema', () => {
      const schemas = [
        {
          namespace: 'manifest',
          types: [{ id: 'Permission', type: 'string' }],
        },
      ];
      expect(inner.normalizeSchema(schemas, 'manifest.json')).toEqual({
        id: 'manifest',
        types: { Permission: { id: 'Permission', type: 'string' } },
        definitions: {},
        refs: {},
      });
    });

    it('handles manifest extensions without a schema', () => {
      const schemas = [
        {
          namespace: 'manifest',
          types: [{
            $extend: 'WebExtensionManifest',
            properties: {
              chrome_url_overrides: {
                type: 'object',
              },
            },
          }],
        },
      ];
      expect(inner.normalizeSchema(schemas, 'url_overrides.json')).toEqual({
        id: 'url_overrides',
        types: {},
        definitions: {
          WebExtensionManifest: {
            properties: {
              chrome_url_overrides: { type: 'object' },
            },
          },
        },
        refs: {
          'url_overrides#/definitions/WebExtensionManifest': {
            namespace: 'manifest',
            type:  'WebExtensionManifest',
          },
        },
      });
    });
  });

  describe('loadSchema', () => {
    it('normalizes and rewrites the schema', () => {
      sandbox
        .stub(inner, 'normalizeSchema')
        .withArgs({ the: 'schema' })
        .returns({ id: 'Foo', normalized: true });
      sandbox
        .stub(inner, 'rewriteObject')
        .withArgs({ normalized: true })
        .returns({ rewritten: true });
      expect(inner.loadSchema({ the: 'schema' })).toEqual(
        { id: 'Foo', rewritten: true }
      );
    });

    it('adds a $ref for the manifest namespace', () => {
      sandbox
        .stub(inner, 'normalizeSchema')
        .withArgs({ id: 'manifest' })
        .returns({ id: 'manifest', normalized: true });
      sandbox
        .stub(inner, 'rewriteObject')
        .withArgs({ normalized: true })
        .returns({ rewritten: true });
      expect(inner.loadSchema({ id: 'manifest' })).toEqual({
        id: 'manifest',
        $ref: '#/types/WebExtensionManifest',
        rewritten: true,
      });
    });
  });

  describe('processSchemas', () => {
    it('loads each schema and delegates to helpers', () => {
      const firstSchema = [{ id: 'manifest' }];
      const secondSchema = [{ id: 'manifest' }, { id: 'cookies' }];
      const loadSchema = sandbox.stub(inner, 'loadSchema');
      loadSchema.withArgs(firstSchema).returns({ id: 'manifest', schema: 1 });
      loadSchema.withArgs(secondSchema).returns({ id: 'cookies', schema: 2 });
      sandbox
        .stub(inner, 'mergeSchemas')
        .withArgs({
          manifest: [{ file: 'one', schema: { id: 'manifest', schema: 1 } }],
          cookies: [{ file: 'two', schema: { id: 'cookies', schema: 2 } }],
        })
        .returns({ mergeSchemas: 'done' });
      sandbox
        .stub(inner, 'mapExtendToRef')
        .withArgs({ mergeSchemas: 'done' })
        .returns({ mapExtendToRef: 'done' });
      expect(processSchemas([
        { file: 'one', schema: firstSchema },
        { file: 'two', schema: secondSchema },
      ])).toEqual({ mapExtendToRef: 'done' });
    });
  });

  describe('mergeSchemas', () => {
    it('merges schemas with the same namespace', () => {
      const schemas = [{
        file: 'foo_foo.json',
        schema: [{
          namespace: 'foo',
          types: [{ id: 'Foo', type: 'string' }],
        }],
      }, {
        file: 'foo_bar.json',
        schema: [{
          namespace: 'foo.bar',
          types: [{ id: 'FooBar', type: 'number' }],
          properties: { thing: {} },
        }],
      }, {
        file: 'bar.json',
        schema: [{
          namespace: 'bar',
          types: [{ id: 'Bar', type: 'string' }],
        }],
      }];

      expect(processSchemas(schemas)).toEqual({
        foo: {
          file: 'foo.json',
          schema: {
            id: 'foo',
            definitions: {},
            refs: {},
            types: {
              Foo: { type: 'string' },
              FooBar: { type: 'number' },
            },
            properties: {
              bar: { properties: { thing: {} }, required: ['thing'] },
            },
          },
        },
        bar: {
          file: 'bar.json',
          schema: {
            id: 'bar',
            definitions: {},
            refs: {},
            types: { Bar: { type: 'string' } },
          },
        },
      });
    });
  });

  describe('mapExtendToRef', () => {
    function deepFreeze(obj) {
      if (typeof obj === 'object') {
        Object.keys(obj).forEach((key) => {
          const value = obj[key];
          if (typeof value === 'object' &&
              value !== null &&
              !Object.isFrozen(value)) {
            deepFreeze(value);
          }
        });
        return Object.freeze(obj);
      }
      return obj;
    }

    it('adds the refs to the linked schema', () => {
      const schemas = deepFreeze({
        manifest: {
          file: 'manifest.json',
          schema: {
            types: {
              Permission: {
                anyOf: [
                  { type: 'string', enum: ['downloads'] },
                  { type: 'string' },
                ],
              },
              WebExtensionManifest: {
                properties: {
                  version: { type: 'number' },
                },
                required: ['version'],
              },
            },
            refs: {},
          },
        },
        cookies: {
          file: 'cookies.json',
          schema: {
            definitions: {
              Permission: { type: 'string', enum: ['cookies'] },
            },
            refs: {
              'cookies#/definitions/Permission': {
                namespace: 'manifest',
                type: 'Permission',
              },
            },
          },
        },
        i18n: {
          file: 'i18n.json',
          schema: {
            definitions: {
              WebExtensionManifest: {
                properties: { default_locale: { type: 'string' } },
              },
            },
            refs: {
              'i18n#/definitions/WebExtensionManifest': {
                namespace: 'manifest',
                type: 'WebExtensionManifest',
              },
            },
          },
        },
        foo: {
          file: 'foo.json',
          schema: {
            refs: {
              'foo#/definitions/WebExtensionManifest': {
                namespace: 'manifest',
                type: 'WebExtensionManifest',
              },
            },
          },
        },
      });
      expect(inner.mapExtendToRef(schemas)).toEqual({
        manifest: {
          file: 'manifest.json',
          schema: {
            types: {
              Permission: {
                anyOf: [
                  { type: 'string', enum: ['downloads'] },
                  { type: 'string' },
                  { $ref: 'cookies#/definitions/Permission' },
                ],
              },
              WebExtensionManifest: {
                allOf: [
                  {
                    properties: {
                      version: { type: 'number' },
                    },
                    required: ['version'],
                  },
                  { $ref: 'i18n#/definitions/WebExtensionManifest' },
                  { $ref: 'foo#/definitions/WebExtensionManifest' },
                ],
              },
            },
            refs: {},
          },
        },
        cookies: {
          file: 'cookies.json',
          schema: {
            definitions: {
              Permission: { type: 'string', enum: ['cookies'] },
            },
            refs: {
              'cookies#/definitions/Permission': {
                namespace: 'manifest',
                type: 'Permission',
              },
            },
          },
        },
        i18n: {
          file: 'i18n.json',
          schema: {
            definitions: {
              WebExtensionManifest: {
                properties: { default_locale: { type: 'string' } },
              },
            },
            refs: {
              'i18n#/definitions/WebExtensionManifest': {
                namespace: 'manifest',
                type: 'WebExtensionManifest',
              },
            },
          },
        },
        foo: {
          file: 'foo.json',
          schema: {
            refs: {
              'foo#/definitions/WebExtensionManifest': {
                namespace: 'manifest',
                type: 'WebExtensionManifest',
              },
            },
          },
        },
      });
    });
  });

  describe('rewriteExtend', () => {
    it('moves $extend into definitions and refs', () => {
      const schemas = [{
        namespace: 'manifest',
        types: [{
          $extend: 'WebExtensionManifest',
          properties: { something: { type: 'string' } },
        }],
      }];
      const expected = {
        definitions: {
          WebExtensionManifest: {
            properties: { something: { type: 'string' } },
          },
        },
        refs: {
          'foo#/definitions/WebExtensionManifest': {
            namespace: 'manifest',
            type: 'WebExtensionManifest',
          },
        },
        types: {},
      };
      expect(rewriteExtend(schemas, 'foo')).toEqual(expected);
    });

    it('returns types in an object of types', () => {
      const schemas = [{
        namespace: 'manifest',
        types: [{
          id: 'Yo',
          properties: { hey: { type: 'string' } },
        }],
      }];
      const expected = {
        definitions: {},
        refs: {},
        types: {
          Yo: { properties: { hey: { type: 'string' } } },
        },
      };
      expect(rewriteExtend(schemas, 'foo')).toEqual(expected);
    });

    it('rewrites the extend for $refs defined in the object', () => {
      const original = [{
        namespace: 'manifest',
        types: [{
          id: 'KeyName',
          type: 'string',
        }, {
          $extend: 'WebExtensionManifest',
          properties: {
            browser_action: {
              type: 'object',
              additionalProperties: { $ref: 'UnrecognizedProperty' },
              properties: { default_title: { type: 'string', optional: true } },
              optional: true,
            },
            whatever: { $ref: 'KeyName' },
          },
        }],
      }];
      const expected = {
        definitions: {
          WebExtensionManifest: {
            properties: {
              browser_action: {
                type: 'object',
                additionalProperties: {
                  $ref: 'manifest#/types/UnrecognizedProperty',
                },
                properties: {
                  default_title: { type: 'string', optional: true },
                },
                optional: true,
              },
              whatever: { $ref: 'KeyName' },
            },
          },
        },
        refs: {
          'browserAction#/definitions/WebExtensionManifest': {
            namespace: 'manifest',
            type: 'WebExtensionManifest',
          },
        },
        types: { KeyName: { type: 'string' } },
      };
      expect(rewriteExtend(original, 'browserAction')).toEqual(expected);
    });

    it('throws if there is no $extend or id', () => {
      const schemas = [{
        namespace: 'manifest',
        types: [{
          properties: { uhoh: { type: 'number' } },
        }],
      }];
      expect(
        () => rewriteExtend(schemas, 'foo')
      ).toThrow('$extend or id is required');
    });
  });

  describe('updateWithAddonsLinterData', () => {
    function makeSchemaWithType(name, type) {
      return Object.freeze({
        manifest: {
          file: 'manifest.json',
          schema: {
            types: { [name]: type },
          },
        },
      });
    }

    it('updates the firefox schemas with addons-linter data', () => {
      const firefoxSchemas = {
        manifest: {
          file: 'manifest.json',
          schema: {
            types: {
              FirefoxSpecificProperties: {
                properties: {
                  strict_min_version: { type: 'string' },
                },
              },
            },
          },
        },
      };
      const ourSchemas = {
        manifest: {
          types: {
            FirefoxSpecificProperties: {
              properties: {
                strict_min_version: {
                  default: '42a1',
                  description:
                    'Minimum version of Gecko to support. '
                    + "Defaults to '42a1'. (Requires Gecko 45)",
                  pattern: '^[0-9]{1,3}(\\.[a-z0-9]+)+$',
                },
              },
            },
          },
        },
      };
      const expected = {
        manifest: {
          file: 'manifest.json',
          schema: {
            types: {
              FirefoxSpecificProperties: {
                properties: {
                  strict_min_version: {
                    default: '42a1',
                    description:
                      'Minimum version of Gecko to support. '
                      + "Defaults to '42a1'. (Requires Gecko 45)",
                    pattern: '^[0-9]{1,3}(\\.[a-z0-9]+)+$',
                    type: 'string',
                  },
                },
              },
            },
          },
        },
      };
      expect(
        inner.updateWithAddonsLinterData(firefoxSchemas, ourSchemas)
      ).toEqual(expected);
    });

    it('merges in new values', () => {
      const original = makeSchemaWithType('FirefoxSpecificProperties', {
        properties: {
          update_url: { type: 'string', format: 'url' },
          foo: { type: 'string' },
        },
      });
      const linterUpdates = {
        manifest: {
          types: {
            FirefoxSpecificProperties: {
              properties: { foo: { pattern: '[fF][oO]{2}' } },
            },
          },
        },
      };
      const expected = makeSchemaWithType('FirefoxSpecificProperties', {
        properties: {
          update_url: { type: 'string', format: 'url' },
          foo: { type: 'string', pattern: '[fF][oO]{2}' },
        },
      });
      expect(
        inner.updateWithAddonsLinterData(original, linterUpdates)
      ).toEqual(expected);
    });

    it('overwrites existing values', () => {
      const original = makeSchemaWithType('FirefoxSpecificProperties', {
        properties: {
          update_url: { type: 'string', format: 'url' },
          foo: { type: 'string' },
        },
      });
      const linterUpdates = {
        manifest: {
          types: {
            FirefoxSpecificProperties: {
              properties: { update_url: { format: 'secureUrl' } },
            },
          },
        },
      };
      const expected = makeSchemaWithType('FirefoxSpecificProperties', {
        properties: {
          update_url: { type: 'string', format: 'secureUrl' },
          foo: { type: 'string' },
        },
      });
      expect(
        inner.updateWithAddonsLinterData(original, linterUpdates)
      ).toEqual(expected);
    });

    it('extends arrays', () => {
      const original = makeSchemaWithType('FirefoxSpecificProperties', {
        properties: {
          name: { type: 'string', enum: ['foo', 'bar'] },
        },
      });
      const linterUpdates = {
        manifest: {
          types: {
            FirefoxSpecificProperties: {
              properties: {
                name: { enum: ['baz'] },
              },
            },
          },
        },
      };
      const expected = makeSchemaWithType('FirefoxSpecificProperties', {
        properties: {
          name: { type: 'string', enum: ['foo', 'bar', 'baz'] },
        },
      });
      expect(
        inner.updateWithAddonsLinterData(original, linterUpdates)
      ).toEqual(expected);
    });

    it('updates the first item of an allOf array', () => {
      const original = makeSchemaWithType('WebExtensionManifest', {
        allOf: [{
          properties: {
            icons: {
              type: 'object',
              patternProperties: { '\d+': { type: 'string' } },
            },
          },
        }, {
          $ref: 'browserAction#/definitions/WebExtensionManifest',
        }, {
          $ref: 'commands#/definitions/WebExtensionManifest',
        }],
      });
      const linterUpdates = {
        manifest: {
          types: {
            WebExtensionManifest: {
              allOf: [{
                properties: {
                  icons: { additionalProperties: false },
                },
              }],
            },
          },
        },
      };
      const expected = makeSchemaWithType('WebExtensionManifest', {
        allOf: [{
          properties: {
            icons: {
              type: 'object',
              additionalProperties: false,
              patternProperties: { '\d+': { type: 'string' } },
            },
          },
        }, {
          $ref: 'browserAction#/definitions/WebExtensionManifest',
        }, {
          $ref: 'commands#/definitions/WebExtensionManifest',
        }],
      });
      expect(
        inner.updateWithAddonsLinterData(original, linterUpdates)
      ).toEqual(expected);
    });
  });

  describe('from filesystem', () => {
    const schemaFiles = [
      'manifest.json', 'cookies.json',
    ];
    const firefoxPath = 'tests/schema/firefox';
    const ourPath = 'tests/schema/updates';
    const outputPath = 'tests/schema/imported';
    const expectedPath = 'tests/schema/expected';

    beforeEach(() => {
      createDir(outputPath);
    });

    afterEach(() => {
      removeDir(outputPath);
    });

    it('imports schemas from filesystem', () => {
      importSchemas(firefoxPath, ourPath, outputPath);
      schemaFiles.forEach((file) => {
        expect(
          JSON.parse(fs.readFileSync(path.join(outputPath, file)))
        ).toEqual(JSON.parse(fs.readFileSync(path.join(expectedPath, file))));
      });
    });

    it('skips native_host_manifest.json', () => {
      importSchemas(firefoxPath, ourPath, outputPath);

      expect(
        fs.exists(path.join(expectedPath, 'native_host_manifest.json'))
      ).toBeFalsy();

      // Dummy test to make sure we join correctly and the import
      // actually worked
      expect(
        fs.exists(path.join(expectedPath, 'manifest.json'))
      ).toBeFalsy();
    });
  });

  describe('fetchSchemas', () => {
    const outputPath = 'tests/schema/imported';
    const expectedTarballPath = 'tmp/FIREFOX_AURORA_54_BASE.tar.gz';

    beforeEach(() => {
      expect(fs.existsSync(expectedTarballPath)).toBeFalsy();
      createDir(outputPath);
    });

    afterEach(() => {
      expect(fs.existsSync(expectedTarballPath)).toBeFalsy();
      removeDir(outputPath);
    });

    it('rejects if there is no inputPath or version', () => {
      return fetchSchemas({}).then(
        () => expect(false).toBeTruthy(),
        (err) => expect(err.message).toEqual(
          'inputPath or version is required'
        ));
    });

    it('downloads the firefox source and extracts the schemas', () => {
      const cwd = 'tests/schema';
      const schemaPath = 'firefox';
      const tarball = tar.create({ cwd, gzip: true }, [schemaPath]);
      sandbox
        .stub(inner, 'isBrowserSchema')
        .withArgs('firefox/cookies.json')
        .returns(false)
        .withArgs('firefox/manifest.json')
        .returns(true);
      sandbox
        .stub(request, 'get')
        .withArgs('https://hg.mozilla.org/mozilla-central/archive/FIREFOX_AURORA_54_BASE.tar.gz')
        .returns(tarball);
      expect(fs.readdirSync(outputPath)).toEqual([]);
      return fetchSchemas({ version: 54, outputPath })
        .then(() => {
          expect(fs.readdirSync(outputPath)).toEqual(['manifest.json']);
        });
    });

    it('extracts the schemas from a local file', () => {
      const cwd = 'tests/schema';
      const schemaPath = 'firefox';
      const tarball = tar.create({ cwd, gzip: true }, [schemaPath]);
      sandbox
        .stub(inner, 'isBrowserSchema')
        .withArgs('firefox/cookies.json')
        .returns(false)
        .withArgs('firefox/manifest.json')
        .returns(true);
      sandbox
        .stub(fs, 'createReadStream')
        .withArgs('mozilla-central.tgz')
        .returns(tarball);
      sandbox
        .stub(fs, 'unlinkSync')
        .withArgs('mozilla-central.tgz')
        .returns(undefined);
      expect(fs.readdirSync(outputPath)).toEqual([]);
      return fetchSchemas({ inputPath: 'mozilla-central.tgz', outputPath })
        .then(() => {
          expect(fs.readdirSync(outputPath)).toEqual(['manifest.json']);
        });
    });

    it('handles errors when parsing the tarball', () => {
      const cwd = 'tests/schema';
      const schemaPath = 'firefox';
      const tarball = tar.create({ cwd, gzip: true }, [schemaPath]);
      sandbox
        .stub(fs, 'createReadStream')
        .withArgs('mozilla-central.tgz')
        .returns(tarball);
      const extractedStream = new stream.Duplex({
        read() {
          this.emit('error', new Error('stream error'));
        },
      });
      sandbox
        .stub(tar, 'Parse')
        .returns(extractedStream);
      expect(fs.readdirSync(outputPath)).toEqual([]);
      return fetchSchemas({ inputPath: 'mozilla-central.tgz', outputPath })
        .then(() => {
          expect(true).toBeFalsy();
        }, () => {
          expect(true).toBeTruthy();
        });
    });

    it('handles errors when downloading', () => {
      const mockStream = new stream.Readable({
        read() {
          this.emit('error', new Error('stream error'));
        },
      });
      sandbox
        .stub(request, 'get')
        .withArgs('https://hg.mozilla.org/mozilla-central/archive/FIREFOX_AURORA_54_BASE.tar.gz')
        .returns(mockStream);
      expect(fs.readdirSync(outputPath)).toEqual([]);
      return fetchSchemas({ version: 54, outputPath })
        .then(() => {
          expect(true).toBeFalsy();
        }, () => {
          // Manually remove the tar file since it doesn't get cleaned up.
          fs.unlinkSync('tmp/FIREFOX_AURORA_54_BASE.tar.gz');
          expect(true).toBeTruthy();
        });
    });

    it('handles errors when writing the download', () => {
      const cwd = 'tests/schema';
      const schemaPath = 'firefox';
      const tarball = tar.create({ cwd, gzip: true }, [schemaPath]);
      sandbox
        .stub(request, 'get')
        .withArgs('https://hg.mozilla.org/mozilla-central/archive/FIREFOX_AURORA_54_BASE.tar.gz')
        .returns(tarball);
      const mockStream = new stream.Duplex({
        read() {
          this.emit('error', new Error('stream error'));
        },
        write() {
          this.emit('error', new Error('stream error'));
        },
      });
      sandbox
        .stub(fs, 'createWriteStream')
        .withArgs('tmp/FIREFOX_AURORA_54_BASE.tar.gz')
        .returns(mockStream);
      expect(fs.readdirSync(outputPath)).toEqual([]);
      return fetchSchemas({ version: 54, outputPath })
        .then(() => {
          expect(true).toBeFalsy();
        }, () => {
          expect(true).toBeTruthy();
        });
    });
  });

  describe('isBrowserSchema', () => {
    it('pulls in browser and toolkit schemas', () => {
      const files = [
        'moz/browser/components/extensions/schemas/bookmarks.json',
        'moz/toolkit/components/extensions/schemas/manifest.json',
        'moz/toolkit/components/extensions/schemas/Schemas.jsm',
      ];
      expect(files.filter((f) => inner.isBrowserSchema(f))).toEqual([
        'moz/browser/components/extensions/schemas/bookmarks.json',
        'moz/toolkit/components/extensions/schemas/manifest.json',
      ]);
    });
  });

  describe('foldSchemas', () => {
    it('does not fold non-matching schemas', () => {
      const schemas = [
        { namespace: 'manifest' },
        { namespace: 'omnibox' },
      ];
      // Copy the schemas so we can verify they're unchanged and un-mutated.
      const expectedSchemas = schemas.map((schema) => ({ ...schema }));
      expect(foldSchemas(schemas)).toEqual(expectedSchemas);
    });

    it('folds matching schemas, maintaining types at top-level', () => {
      const schemas = [
        { namespace: 'manifest' },
        { namespace: 'privacy.network',
          properties: { networkPredictionEnabled: {} },
          types: [{
            id: 'IPHandlingPolicy',
            type: 'string',
            enum: ['default', 'disable_non_proxied_udp'],
          }],
        },
        { namespace: 'privacy',
          permissions: ['privacy'],
          properties: { foo: {} },
          types: [{
            $extend: 'permission',
            choices: [{ type: 'string', enum: ['privacy'] }],
          }],
        },
        { namespace: 'privacy.websites',
          properties: { thirdPartyCookiesAllowed: {} } },
      ];
      expect(foldSchemas(schemas)).toEqual([
        { namespace: 'manifest' },
        { namespace: 'privacy',
          permissions: ['privacy'],
          properties: {
            foo: {},
            network: {
              properties: { networkPredictionEnabled: {} },
            },
            websites: {
              properties: { thirdPartyCookiesAllowed: {} },
            },
          },
          types: [{
            $extend: 'permission',
            choices: [{ type: 'string', enum: ['privacy'] }],
          }, {
            id: 'IPHandlingPolicy',
            type: 'string',
            enum: ['default', 'disable_non_proxied_udp'],
          }],
        },
      ]);
    });

    it('handles a base schema without properties', () => {
      const schemas = [
        { namespace: 'manifest' },
        { namespace: 'privacy.network',
          properties: { networkPredictionEnabled: {} } },
        { namespace: 'privacy', permissions: ['privacy'] },
        { namespace: 'privacy.websites',
          properties: { thirdPartyCookiesAllowed: {} } },
      ];
      expect(foldSchemas(schemas)).toEqual([
        { namespace: 'manifest' },
        { namespace: 'privacy',
          permissions: ['privacy'],
          properties: {
            network: {
              properties: { networkPredictionEnabled: {} },
            },
            websites: {
              properties: { thirdPartyCookiesAllowed: {} },
            },
          },
        },
      ]);
    });

    it('handles matching schemas without a base schema', () => {
      const schemas = [
        { namespace: 'manifest' },
        { namespace: 'privacy.network',
          properties: { networkPredictionEnabled: {} } },
        { namespace: 'privacy.websites',
          properties: { thirdPartyCookiesAllowed: {} } },
      ];
      expect(foldSchemas(schemas)).toEqual([
        { namespace: 'manifest' },
        { namespace: 'privacy',
          properties: {
            network: {
              properties: { networkPredictionEnabled: {} },
            },
            websites: {
              properties: { thirdPartyCookiesAllowed: {} },
            },
          },
        },
      ]);
    });

    it('handles a single schema', () => {
      const schemas = [
        { namespace: 'alarms',
          permissions: ['alarms'],
          properties: {} },
      ];
      const expectedSchemas = schemas.map((schema) => ({ ...schema }));
      expect(foldSchemas(schemas)).toEqual(expectedSchemas);
    });

    it('throws if there is more than two levels of nesting', () => {
      const schemas = [
        { namespace: 'devtools.panels.sidebars',
          properties: { createSidebar: {} } },
      ];
      expect(
        () => foldSchemas(schemas)
      ).toThrow(/may only have one level of nesting/);
    });

    it('throws if there is more than one matching namespace', () => {
      const schemas = Object.freeze([
        Object.freeze({
          namespace: 'devtools.sidebar',
          properties: { createSidebar: {} },
        }),
        Object.freeze({
          namespace: 'devtools.sidebar',
          properties: { createBar: {} },
        }),
      ]);
      expect(() => foldSchemas(schemas)).toThrow(/matching namespaces/);
    });

    it('throws if there is more than one base namespace', () => {
      const schemas = Object.freeze([
        Object.freeze({
          namespace: 'devtools',
          properties: { createSidebar: {} },
        }),
        Object.freeze({
          namespace: 'devtools',
          properties: { createBar: {} },
        }),
      ]);
      expect(() => foldSchemas(schemas)).toThrow(/matching namespaces/);
    });
  });

  describe('filterSchemas', () => {
    beforeAll(() => {
      ignoredSchemas.push('some_namespace');
    });

    afterAll(() => {
      ignoredSchemas.pop();
    });

    it('removes schemas that we want to ignore', () => {
      const goodSchema = Object.freeze({
        namespace: 'yay',
        properties: { yay: 'woo' },
      });
      const schemas = [
        goodSchema,
        { namespace: 'some_namespace', properties: { foo: {} } },
      ];
      expect(filterSchemas(schemas)).toEqual([goodSchema]);
    });

    it('does not remove anything if there are no ignored schemas', () => {
      const schemas = Object.freeze([
        Object.freeze({ namespace: 'alarms', permissions: ['alarms'] }),
      ]);
      expect(filterSchemas(schemas)).toEqual(schemas);
    });
  });

  describe('stripTrailingNullByte', () => {
    it('strips a trailing null byte if present at the end', () => {
      const str = 'foo\u0000';
      expect(stripTrailingNullByte(str)).toEqual('foo');
    });

    it('returns the string unchanged if not present', () => {
      const str = 'bar';
      expect(stripTrailingNullByte(str)).toBe(str);
    });

    it('returns the string unchanged if not at the end', () => {
      const str = 'b\u0000az';
      expect(stripTrailingNullByte(str)).toBe(str);
    });

    it('handles empty strings', () => {
      const str = '';
      expect(stripTrailingNullByte(str)).toBe(str);
    });
  });

  describe('downloadUrl', () => {
    it('uses aurora if version is < 55', () => {
      expect(downloadUrl(48)).toMatch(
        /archive\/FIREFOX_AURORA_48_BASE.tar.gz$/);
      expect(downloadUrl(54)).toMatch(
        /archive\/FIREFOX_AURORA_54_BASE.tar.gz$/);
    });

    it('uses beta if version is >= 55', () => {
      expect(downloadUrl(55)).toMatch(
        /archive\/FIREFOX_BETA_55_BASE.tar.gz$/);
      expect(downloadUrl(60)).toMatch(
        /archive\/FIREFOX_BETA_60_BASE.tar.gz$/);
    });

    it('uses tip for nightly', () => {
      expect(downloadUrl('nightly')).toMatch(
        /archive\/tip.tar.gz$/);
    });
  });
});
