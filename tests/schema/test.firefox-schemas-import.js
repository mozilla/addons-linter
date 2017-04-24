import fs from 'fs';
import fstream from 'fstream';
import path from 'path';
import zlib from 'zlib';

import request from 'request';
import tar from 'tar';

import {
  FLAG_PATTERN_REWRITES,
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
} from 'schema/firefox-schemas-import';

describe('firefox schema import', () => {
  let sandbox;

  function createDir(dirPath) {
    fs.mkdirSync(dirPath);
  }

  function removeDir(dirPath) {
    fs.readdirSync(dirPath).forEach(
      (file) => fs.unlinkSync(path.join(dirPath, file)));
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
      assert.deepEqual(rewriteOptionalToRequired(obj), obj);
    });

    it('converts optional to required', () => {
      const obj = {
        foo: { type: 'string', optional: true },
        bar: { type: 'array', optional: false },
        baz: { type: 'boolean' },
      };
      assert.deepEqual(rewriteOptionalToRequired(obj), {
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
      assert.deepEqual(rewriteOptionalToRequired(obj), {
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
      assert.deepEqual(rewriteOptionalToRequired(obj), {
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
      assert.deepEqual(rewriteOptionalToRequired(obj), {
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
      assert.deepEqual(rewriteValue('MyType', schema), {
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
      assert.equal(rewriteValue('id', 'foo'), undefined);
    });

    it('removes type: any', () => {
      assert.equal(rewriteValue('type', 'any'), undefined);
      assert.equal(rewriteValue('type', 'string'), 'string');
    });

    describe('pattern rewriting', () => {
      const originalPattern = '(?i)foo';

      before(() => {
        FLAG_PATTERN_REWRITES[originalPattern] = 'sup';
      });

      after(() => {
        delete FLAG_PATTERN_REWRITES[originalPattern];
      });

      it('throws on an unknown pattern with flags', () => {
        assert.throws(
          () => rewriteValue('pattern', '(?i)^abc$'),
          'pattern (?i)^abc$ must be rewritten');
      });

      it('rewrites known patterns', () => {
        assert.equal(rewriteValue('pattern', originalPattern), 'sup');
      });

      it('does not rewrite unknown patterns without flags', () => {
        assert.equal(rewriteValue('pattern', 'abc(?i)def'), 'abc(?i)def');
      });
    });

    it('updates $ref to JSON pointer', () => {
      assert.equal(rewriteValue('$ref', 'Manifest'), '#/types/Manifest');
      assert.equal(
        rewriteValue('$ref', 'extension_types.Timer'),
        'extension_types#/types/Timer');
    });

    it("doesn't update $refs that have been updated already", () => {
      const $ref = 'manifest#/types/UnrecognizedProperty';
      assert.strictEqual(rewriteValue('$ref', $ref), $ref);
    });

    it('handles arrays', () => {
      const original = [{ type: 'string' }, { type: 'any' }, { $ref: 'Foo' }];
      assert.deepEqual(
        rewriteValue('anyOf', original),
        [{ type: 'string' }, {}, { $ref: '#/types/Foo' }]);
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
      assert.deepEqual(rewriteValue('foo', original), expected);
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
      assert.deepEqual(rewriteValue('foo', original), expected);
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
      assert.deepEqual(rewriteValue('foo', original), expected);
    });

    it('leaves $ref objects that only have an extra optional property', () => {
      const original = { $ref: 'Foo', optional: true };
      const expected = { $ref: '#/types/Foo', optional: true };
      assert.deepEqual(rewriteValue('foo', original), expected);
    });

    it('strips UnrecognizedProperty in additionalProperties', () => {
      assert.equal(
        rewriteValue('additionalProperties', { $ref: 'UnrecognizedProperty' }),
        undefined);
    });

    describe('known refs that are not specific', () => {
      beforeEach(() => { refMap.SomeType = 'manifest#/types/SomeType'; });
      afterEach(() => { delete refMap.SomeType; });

      it('get rewritten to good paths', () => {
        assert.equal(
          rewriteValue('$ref', 'SomeType'),
          'manifest#/types/SomeType');
      });
    });
  });

  describe('rewriteKey', () => {
    it('rewrites choices to anyOf', () => {
      assert.equal(rewriteKey('choices'), 'anyOf');
    });

    it('leaves other values unchanged', () => {
      assert.equal(rewriteKey('properties'), 'properties');
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
      assert.deepEqual(inner.rewriteObject(schema),
        { anyOf: [{ type: 'string' }, { type: 'number' }], keepMe: 'yay' });
    });
  });

  describe('loadTypes', () => {
    it('converts the types array to an object', () => {
      assert.deepEqual(
        loadTypes([
          { id: 'Foo', type: 'object' },
          { id: 'Bar', type: 'string' },
        ]),
        {
          Foo: { id: 'Foo', type: 'object' },
          Bar: { id: 'Bar', type: 'string' },
        });
    });

    it('handles there not being any types', () => {
      assert.deepEqual(loadTypes(undefined), {});
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
      assert.deepEqual(
        inner.normalizeSchema(schemas, 'cookies.json'),
        {
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
      assert.deepEqual(
        inner.normalizeSchema(schemas, 'manifest.json'),
        {
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
      assert.deepEqual(
        inner.normalizeSchema(schemas, 'url_overrides.json'),
        {
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
      assert.deepEqual(
        inner.loadSchema({ the: 'schema' }), { id: 'Foo', rewritten: true });
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
      assert.deepEqual(
        inner.loadSchema({ id: 'manifest' }),
        {
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
      assert.deepEqual(
        processSchemas([
          { file: 'one', schema: firstSchema },
          { file: 'two', schema: secondSchema },
        ]),
        { mapExtendToRef: 'done' });
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

      assert.deepEqual(
        processSchemas(schemas),
        {
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
      assert.deepEqual(
        inner.mapExtendToRef(schemas),
        {
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
      assert.deepEqual(rewriteExtend(schemas, 'foo'), expected);
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
      assert.deepEqual(rewriteExtend(schemas, 'foo'), expected);
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
      assert.deepEqual(rewriteExtend(original, 'browserAction'), expected);
    });

    it('throws if there is no $extend or id', () => {
      const schemas = [{
        namespace: 'manifest',
        types: [{
          properties: { uhoh: { type: 'number' } },
        }],
      }];
      assert.throws(
        () => rewriteExtend(schemas, 'foo'),
        '$extend or id is required');
    });
  });

  describe('updateWithAddonsLinterData', () => {
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
      assert.deepEqual(
        inner.updateWithAddonsLinterData(firefoxSchemas, ourSchemas),
        expected);
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
      assert.deepEqual(
        inner.updateWithAddonsLinterData(original, linterUpdates),
        expected);
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
      assert.deepEqual(
        inner.updateWithAddonsLinterData(original, linterUpdates),
        expected);
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
      assert.deepEqual(
        inner.updateWithAddonsLinterData(original, linterUpdates),
        expected);
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
      assert.deepEqual(
        inner.updateWithAddonsLinterData(original, linterUpdates),
        expected);
    });
  });

  describe('from filesystem', () => {
    const schemaFiles = ['manifest.json', 'cookies.json'];
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
        assert.deepEqual(
          JSON.parse(fs.readFileSync(path.join(outputPath, file))),
          JSON.parse(fs.readFileSync(path.join(expectedPath, file))));
      });
    });
  });

  describe('fetchSchemas', () => {
    const outputPath = 'tests/schema/imported';

    beforeEach(() => {
      createDir(outputPath);
    });

    afterEach(() => {
      removeDir(outputPath);
    });

    it('downloads the firefox source and extracts the schemas', () => {
      // eslint-disable-next-line new-cap
      const packer = tar.Pack({ noProprietary: true });
      const schemaPath = 'tests/schema/firefox';
      // eslint-disable-next-line new-cap
      const tarball = fstream.Reader({ path: schemaPath, type: 'Directory' })
        .pipe(packer)
        .pipe(zlib.createGzip());
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
      assert.deepEqual(fs.readdirSync(outputPath), []);
      return fetchSchemas({ version: 54, outputPath })
        .then(() => {
          assert.deepEqual(fs.readdirSync(outputPath), ['manifest.json']);
        });
    });

    it('extracts the schemas from a local file', () => {
      // eslint-disable-next-line new-cap
      const packer = tar.Pack({ noProprietary: true });
      const schemaPath = 'tests/schema/firefox';
      // eslint-disable-next-line new-cap
      const tarball = fstream.Reader({ path: schemaPath, type: 'Directory' })
        .pipe(packer)
        .pipe(zlib.createGzip());
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
      assert.deepEqual(fs.readdirSync(outputPath), []);
      return fetchSchemas({ inputPath: 'mozilla-central.tgz', outputPath })
        .then(() => {
          assert.deepEqual(fs.readdirSync(outputPath), ['manifest.json']);
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
      assert.deepEqual(
        files.filter((f) => inner.isBrowserSchema(f)),
        [
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
      assert.deepEqual(foldSchemas(schemas), expectedSchemas);
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
      assert.deepEqual(foldSchemas(schemas), [
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
      assert.deepEqual(foldSchemas(schemas), [
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
      assert.deepEqual(foldSchemas(schemas), [
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
      assert.deepEqual(foldSchemas(schemas), expectedSchemas);
    });

    it('throws if there is more than two levels of nesting', () => {
      const schemas = [
        { namespace: 'devtools.panels.sidebars',
          properties: { createSidebar: {} } },
      ];
      assert.throws(
        () => foldSchemas(schemas),
        /may only have one level of nesting/);
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
      assert.throws(() => foldSchemas(schemas), /matching namespaces/);
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
      assert.throws(() => foldSchemas(schemas), /matching namespaces/);
    });
  });

  describe('filterSchemas', () => {
    before(() => {
      ignoredSchemas.push('some_namespace');
    });

    after(() => {
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
      assert.deepEqual(filterSchemas(schemas), [goodSchema]);
    });

    it('does not remove anything if there are no ignored schemas', () => {
      const schemas = Object.freeze([
        Object.freeze({ namespace: 'alarms', permissions: ['alarms'] }),
      ]);
      assert.deepEqual(filterSchemas(schemas), schemas);
    });
  });
});
