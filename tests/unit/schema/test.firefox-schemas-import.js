import fs from 'fs';
import path from 'path';

import yazl from 'yazl';
import yauzl from 'yauzl';
import tmp from 'tmp-promise';

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

const { pending } = global;

function prepareTmpDir() {
  const tmpDir = tmp.dirSync({ mode: '0750', unsafeCleanup: true });
  const outputPath = `${tmpDir.name}/schema-imported`;
  const inputPath = `${tmpDir.name}/mozilla-central.zip`;
  const cleanup = () => tmpDir.removeCallback();

  fs.mkdirSync(outputPath);
  return { outputPath, inputPath, cleanup };
}

async function createZipFile(inputPath) {
  const cwd = 'tests/fixtures/schema';
  const schemaPath = `${cwd}/firefox`;
  const zipfile = new yazl.ZipFile();

  const files = ['cookies.json', 'manifest.json', 'native_host_manifest.json'];

  files.forEach((file) => {
    zipfile.addFile(`${schemaPath}/${file}`, file);
  });

  await new Promise((resolve) => {
    zipfile.outputStream
      .pipe(fs.createWriteStream(inputPath))
      .on('close', () => resolve());
    zipfile.end();
  });
}

describe('firefox schema import', () => {
  // Skip the Firefox schema import tests on windows.
  if (process.platform === 'win32') {
    // eslint-disable-next-line jest/no-disabled-tests
    pending();
    return;
  }

  describe('rewriteOptionalToRequired', () => {
    it('handles non-objects', () => {
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
          allOf: [{ $ref: '#/types/Whatever' }, { description: 'a thing' }],
        },
        baz: { type: 'boolean' },
        required: ['baz'],
      });
    });

    it('handles an allOf with no nested schemas being optional', () => {
      const obj = {
        foo: { type: 'string', optional: true },
        bar: {
          allOf: [{ $ref: '#/types/Whatever' }, { type: 'string' }],
        },
        baz: { type: 'boolean' },
      };
      expect(rewriteOptionalToRequired(obj)).toEqual({
        foo: { type: 'string' },
        bar: {
          allOf: [{ $ref: '#/types/Whatever' }, { type: 'string' }],
        },
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
        expect(() => rewriteValue('pattern', '(?i)^abc$')).toThrow(
          'pattern (?i)^abc$ must be rewritten'
        );
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
      expect(rewriteValue('$ref', 'extension_types.Timer')).toEqual(
        'extension_types#/types/Timer'
      );
    });

    it("doesn't update $refs that have been updated already", () => {
      const $ref = 'manifest#/types/UnrecognizedProperty';
      expect(rewriteValue('$ref', $ref)).toBe($ref);
    });

    it('handles arrays', () => {
      const original = [{ type: 'string' }, { type: 'any' }, { $ref: 'Foo' }];
      expect(rewriteValue('anyOf', original)).toEqual([
        { type: 'string' },
        {},
        { $ref: '#/types/Foo' },
      ]);
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
      beforeEach(() => {
        refMap.SomeType = 'manifest#/types/SomeType';
      });
      afterEach(() => {
        delete refMap.SomeType;
      });

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
      expect(inner.rewriteObject(schema)).toEqual({
        anyOf: [{ type: 'string' }, { type: 'number' }],
        keepMe: 'yay',
      });
    });
  });

  describe('loadTypes', () => {
    it('converts the types array to an object', () => {
      expect(
        loadTypes([
          { id: 'Foo', type: 'object' },
          { id: 'Bar', type: 'string' },
        ])
      ).toEqual({
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
          types: [
            {
              $extend: 'WebExtensionManifest',
              choices: [{ type: 'string', enum: ['cookies'] }],
            },
          ],
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
      expect(inner.normalizeSchema(schemas, 'cookies.json')).toEqual([
        {
          id: 'cookies',
          types: {
            Cookie: { id: 'Cookie', type: 'string' },
            CookieJar: { id: 'CookieJar', type: 'object' },
          },
          somethingElse: 'foo',
          definitions: {
            WebExtensionManifest: {
              choices: [{ type: 'string', enum: ['cookies'] }],
            },
          },
          refs: {
            'cookies#/definitions/WebExtensionManifest': {
              namespace: 'manifest',
              type: 'WebExtensionManifest',
            },
          },
        },
      ]);
    });

    it('handles the manifest schema', () => {
      const schemas = [
        {
          namespace: 'manifest',
          types: [{ id: 'Permission', type: 'string' }],
        },
      ];
      expect(inner.normalizeSchema(schemas, 'manifest.json')).toEqual([
        {
          id: 'manifest',
          types: { Permission: { id: 'Permission', type: 'string' } },
          definitions: {},
          refs: {},
        },
      ]);
    });

    it('handles manifest extensions without a schema', () => {
      const schemas = [
        {
          namespace: 'manifest',
          types: [
            {
              $extend: 'WebExtensionManifest',
              properties: {
                chrome_url_overrides: {
                  type: 'object',
                },
              },
            },
          ],
        },
      ];
      expect(inner.normalizeSchema(schemas, 'url_overrides.json')).toEqual([
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
              type: 'WebExtensionManifest',
            },
          },
        },
      ]);
    });

    it('resolves the top level $import in API namespace definitions', () => {
      const schemas = [
        {
          namespace: 'action',
          functions: [{ name: 'setTitle', type: 'function', parameters: [] }],
          events: [{ name: 'onClicked', type: 'function', parameters: [] }],
          // min/max_manifest_version are expected to not be imported in the
          // JSONSchema definition importing this one.
          min_manifest_version: 3,
          max_manifest_version: 3,
        },
        {
          namespace: 'browserAction',
          $import: 'action',
          max_manifest_version: 2,
        },
      ];

      expect(inner.normalizeSchema(schemas, 'browser_action.json')).toEqual([
        {
          id: 'action',
          definitions: {},
          refs: {},
          types: {},
          functions: [{ name: 'setTitle', type: 'function', parameters: [] }],
          events: [{ name: 'onClicked', type: 'function', parameters: [] }],
          min_manifest_version: 3,
          max_manifest_version: 3,
        },
        {
          id: 'browserAction',
          definitions: {},
          refs: {},
          types: {},
          functions: [{ name: 'setTitle', type: 'function', parameters: [] }],
          events: [{ name: 'onClicked', type: 'function', parameters: [] }],
          max_manifest_version: 2,
        },
      ]);
    });
  });

  it('throws an explicit error on $import property in imported namespace', () => {
    const schemas = [
      {
        namespace: 'action',
        functions: [{ name: 'fn', type: 'function', parameters: [] }],
      },
      {
        namespace: 'action2',
        $import: 'action',
      },
      {
        namespace: 'action3',
        $import: 'action2',
      },
    ];

    expect(() => inner.normalizeSchema(schemas, 'invalid_import.json')).toThrow(
      'Unsupported schema format: "action3" is importing "action2" which also includes an "$import" property'
    );
  });

  describe('loadSchema', () => {
    it('normalizes and rewrites the schema', () => {
      sinon
        .stub(inner, 'normalizeSchema')
        .withArgs({ the: 'schema' })
        .returns([{ id: 'Foo', normalized: true }]);
      sinon
        .stub(inner, 'rewriteObject')
        .withArgs({ normalized: true })
        .returns({ rewritten: true });
      expect(inner.loadSchema({ the: 'schema' })).toEqual([
        {
          id: 'Foo',
          rewritten: true,
        },
      ]);
    });

    it('adds a $ref for the manifest namespace', () => {
      sinon
        .stub(inner, 'normalizeSchema')
        .withArgs({ id: 'manifest' })
        .returns([{ id: 'manifest', normalized: true }]);
      sinon
        .stub(inner, 'rewriteObject')
        .withArgs({ normalized: true })
        .returns({ rewritten: true });
      expect(inner.loadSchema({ id: 'manifest' })).toEqual([
        {
          id: 'manifest',
          rewritten: true,
        },
      ]);
    });
  });

  describe('processSchemas', () => {
    it('loads each schema and delegates to helpers', () => {
      const firstSchema = [{ id: 'manifest' }];
      const secondSchema = [{ id: 'manifest' }, { id: 'cookies' }];
      const loadSchema = sinon.stub(inner, 'loadSchema');
      loadSchema.withArgs(firstSchema).returns([{ id: 'manifest', schema: 1 }]);
      loadSchema.withArgs(secondSchema).returns([{ id: 'cookies', schema: 2 }]);
      sinon
        .stub(inner, 'mergeSchemas')
        .withArgs({
          manifest: [{ file: 'one', schema: { id: 'manifest', schema: 1 } }],
          cookies: [{ file: 'two', schema: { id: 'cookies', schema: 2 } }],
        })
        .returns({ mergeSchemas: 'done' });
      sinon
        .stub(inner, 'mapExtendToRef')
        .withArgs({ mergeSchemas: 'done' })
        .returns({ mapExtendToRef: 'done' });
      expect(
        processSchemas([
          { file: 'one', schema: firstSchema },
          { file: 'two', schema: secondSchema },
        ])
      ).toEqual({ mapExtendToRef: 'done' });
    });
  });

  describe('mergeSchemas', () => {
    it('merges schemas with the same namespace', () => {
      const schemas = [
        {
          file: 'foo_foo.json',
          schema: [
            {
              namespace: 'foo',
              types: [{ id: 'Foo', type: 'string' }],
            },
          ],
        },
        {
          file: 'foo_bar.json',
          schema: [
            {
              namespace: 'foo.bar',
              types: [{ id: 'FooBar', type: 'number' }],
              properties: { thing: {} },
            },
          ],
        },
        {
          file: 'bar.json',
          schema: [
            {
              namespace: 'bar',
              types: [{ id: 'Bar', type: 'string' }],
            },
          ],
        },
      ];

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
          if (
            typeof value === 'object' &&
            value !== null &&
            !Object.isFrozen(value)
          ) {
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
      const schemas = [
        {
          namespace: 'manifest',
          types: [
            {
              $extend: 'WebExtensionManifest',
              properties: { something: { type: 'string' } },
            },
          ],
        },
      ];
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
      const schemas = [
        {
          namespace: 'manifest',
          types: [
            {
              id: 'Yo',
              properties: { hey: { type: 'string' } },
            },
          ],
        },
      ];
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
      const original = [
        {
          namespace: 'manifest',
          types: [
            {
              id: 'KeyName',
              type: 'string',
            },
            {
              $extend: 'WebExtensionManifest',
              properties: {
                browser_action: {
                  type: 'object',
                  additionalProperties: { $ref: 'UnrecognizedProperty' },
                  properties: {
                    default_title: { type: 'string', optional: true },
                  },
                  optional: true,
                },
                whatever: { $ref: 'KeyName' },
              },
            },
          ],
        },
      ];
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

    it('merges extended types property with properties originated by multiple entries', () => {
      const schemas = [
        {
          namespace: 'manifest',
          types: [
            {
              id: 'ActionManifest',
              type: 'object',
            },
            {
              $extend: 'WebExtensionManifest',
              properties: {
                action: {
                  min_manifest_version: 3,
                  $ref: 'ActionManifest',
                  optional: true,
                },
              },
            },
            {
              $extend: 'WebExtensionManifest',
              properties: {
                browser_action: {
                  max_manifest_version: 2,
                  $ref: 'ActionManifest',
                  optional: true,
                },
              },
            },
          ],
        },
      ];

      const expected = {
        definitions: {
          WebExtensionManifest: {
            properties: {
              browser_action: {
                $ref: 'ActionManifest',
                max_manifest_version: 2,
                optional: true,
              },
              action: {
                $ref: 'ActionManifest',
                min_manifest_version: 3,
                optional: true,
              },
            },
          },
        },
        refs: {
          'action#/definitions/WebExtensionManifest': {
            namespace: 'manifest',
            type: 'WebExtensionManifest',
          },
        },
        types: {
          ActionManifest: { type: 'object' },
        },
      };

      expect(rewriteExtend(schemas, 'action')).toEqual(expected);
    });

    it('throws if there is no $extend or id', () => {
      const schemas = [
        {
          namespace: 'manifest',
          types: [
            {
              properties: { uhoh: { type: 'number' } },
            },
          ],
        },
      ];
      expect(() => rewriteExtend(schemas, 'foo')).toThrow(
        '$extend or id is required'
      );
    });

    it('throws if extended types properties are overwritten by a new entry', () => {
      const schemas = [
        {
          namespace: 'manifest',
          types: [
            {
              id: 'ActionManifest',
              type: 'object',
            },
            {
              $extend: 'WebExtensionManifest',
              properties: {
                action: {
                  min_manifest_version: 3,
                  $ref: 'ActionManifest',
                  optional: true,
                },
              },
            },
            {
              $extend: 'WebExtensionManifest',
              properties: {
                // Fake schema entry which contains a property definition that would overwrite
                // the previous one above and is expected to throw an explicit unsupport schema
                // data error.
                action: {
                  max_manifest_version: 2,
                  $ref: 'ActionManifest',
                  optional: true,
                },
              },
            },
          ],
        },
      ];

      expect(() => rewriteExtend(schemas, 'action')).toThrow(
        /Unsupported schema format: detected multiple extend schema entries .* while processing "action" namespace/
      );
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
                    'Minimum version of Gecko to support. ' +
                    "Defaults to '42a1'. (Requires Gecko 45)",
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
                      'Minimum version of Gecko to support. ' +
                      "Defaults to '42a1'. (Requires Gecko 45)",
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
      expect(inner.updateWithAddonsLinterData(original, linterUpdates)).toEqual(
        expected
      );
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
      expect(inner.updateWithAddonsLinterData(original, linterUpdates)).toEqual(
        expected
      );
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
      expect(inner.updateWithAddonsLinterData(original, linterUpdates)).toEqual(
        expected
      );
    });

    it('updates the first item of an allOf array', () => {
      const original = makeSchemaWithType('WebExtensionManifest', {
        allOf: [
          {
            properties: {
              icons: {
                type: 'object',
                // eslint-disable-next-line no-useless-escape
                patternProperties: { 'd+': { type: 'string' } },
              },
            },
          },
          {
            $ref: 'browserAction#/definitions/WebExtensionManifest',
          },
          {
            $ref: 'commands#/definitions/WebExtensionManifest',
          },
        ],
      });
      const linterUpdates = {
        manifest: {
          types: {
            WebExtensionManifest: {
              allOf: [
                {
                  properties: {
                    icons: { additionalProperties: false },
                  },
                },
              ],
            },
          },
        },
      };
      const expected = makeSchemaWithType('WebExtensionManifest', {
        allOf: [
          {
            properties: {
              icons: {
                type: 'object',
                additionalProperties: false,
                // eslint-disable-next-line no-useless-escape
                patternProperties: { 'd+': { type: 'string' } },
              },
            },
          },
          {
            $ref: 'browserAction#/definitions/WebExtensionManifest',
          },
          {
            $ref: 'commands#/definitions/WebExtensionManifest',
          },
        ],
      });
      expect(inner.updateWithAddonsLinterData(original, linterUpdates)).toEqual(
        expected
      );
    });

    it('can create a copy of a namepsace with updates', () => {
      const original = {
        menus: {
          file: 'menus.json',
          schema: {
            id: 'menus',
            permissions: ['menus'],
            properties: { create: {} },
          },
        },
      };
      const linterUpdates = {
        menus: {
          file: 'contextMenus.json',
          id: 'contextMenus',
          permissions: ['contextMenus'],
        },
      };
      const expected = {
        ...original,
        contextMenus: {
          file: 'contextMenus.json',
          schema: {
            id: 'contextMenus',
            // We don't really want menus in here but it won't hurt anything.
            permissions: ['menus', 'contextMenus'],
            properties: { create: {} },
          },
        },
      };
      expect(inner.updateWithAddonsLinterData(original, linterUpdates)).toEqual(
        expected
      );
    });
  });

  describe('from filesystem', () => {
    const schemaFiles = ['manifest.json', 'cookies.json'];
    const firefoxPath = 'tests/fixtures/schema/firefox';
    const ourPath = 'tests/fixtures/schema/updates';
    const expectedPath = 'tests/fixtures/schema/expected';
    let tmpDir;

    beforeEach(() => {
      tmpDir = prepareTmpDir();
    });

    afterEach(() => {
      tmpDir.cleanup();
    });

    it('imports schemas from filesystem', () => {
      const { outputPath } = tmpDir;

      importSchemas(firefoxPath, ourPath, outputPath);
      schemaFiles.forEach((file) => {
        expect(
          JSON.parse(fs.readFileSync(path.join(outputPath, file)))
        ).toEqual(JSON.parse(fs.readFileSync(path.join(expectedPath, file))));
      });
    });

    it('skips native_host_manifest.json', () => {
      const { outputPath } = tmpDir;

      importSchemas(firefoxPath, ourPath, outputPath);
      expect(
        fs.existsSync(path.join(expectedPath, 'native_host_manifest.json'))
      ).toEqual(false);

      // Dummy test to make sure we join correctly and the import
      // actually worked
      expect(fs.existsSync(path.join(expectedPath, 'manifest.json'))).toEqual(
        true
      );
    });
  });

  describe('fetchSchemas', () => {
    let tmpDir;

    beforeEach(() => {
      tmpDir = prepareTmpDir();
    });

    afterEach(() => {
      tmpDir.cleanup();
    });

    it('extracts the schemas from a local file', async () => {
      const { inputPath, outputPath } = tmpDir;
      const zipfile = await createZipFile(inputPath);

      sinon
        .stub(inner, 'isBrowserSchema')
        .withArgs('cookies.json')
        .returns(false)
        .withArgs('manifest.json')
        .returns(true);
      sinon.stub(fs, 'createReadStream').withArgs(inputPath).returns(zipfile);

      expect(fs.readdirSync(outputPath)).toEqual([]);
      await fetchSchemas({ inputPath, outputPath });
      expect(fs.readdirSync(outputPath)).toEqual(['manifest.json']);
    });

    it('handles errors when opening the zipfile', async () => {
      const { inputPath, outputPath } = tmpDir;
      const zipfile = await createZipFile(inputPath);

      sinon.stub(fs, 'createReadStream').withArgs(inputPath).returns(zipfile);

      sinon.stub(yauzl, 'open').throws();
      expect(fs.readdirSync(outputPath)).toEqual([]);
      await expect(fetchSchemas({ inputPath, outputPath })).rejects.toThrow();
    });

    it('handles errors when parsing and processing the zipfile', async () => {
      const { outputPath } = tmpDir;

      await expect(
        fetchSchemas({
          inputPath: 'tests/fixtures/wrong-entry-sizes.zip',
          outputPath,
        })
      ).rejects.toThrow(
        'compressed/uncompressed size mismatch for stored file: 0 != 1024'
      );
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
      const schemas = [{ namespace: 'manifest' }, { namespace: 'omnibox' }];
      // Copy the schemas so we can verify they're unchanged and un-mutated.
      const expectedSchemas = schemas.map((schema) => ({ ...schema }));
      expect(foldSchemas(schemas)).toEqual(expectedSchemas);
    });

    it('folds matching schemas, maintaining types at top-level', () => {
      const schemas = [
        { namespace: 'manifest' },
        {
          namespace: 'privacy.network',
          properties: { networkPredictionEnabled: {} },
          types: [
            {
              id: 'IPHandlingPolicy',
              type: 'string',
              enum: ['default', 'disable_non_proxied_udp'],
            },
          ],
        },
        {
          namespace: 'privacy',
          permissions: ['privacy'],
          properties: { foo: {} },
          types: [
            {
              $extend: 'permission',
              choices: [{ type: 'string', enum: ['privacy'] }],
            },
          ],
        },
        {
          namespace: 'privacy.websites',
          properties: { thirdPartyCookiesAllowed: {} },
        },
      ];
      expect(foldSchemas(schemas)).toEqual([
        { namespace: 'manifest' },
        {
          namespace: 'privacy',
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
          types: [
            {
              $extend: 'permission',
              choices: [{ type: 'string', enum: ['privacy'] }],
            },
            {
              id: 'IPHandlingPolicy',
              type: 'string',
              enum: ['default', 'disable_non_proxied_udp'],
            },
          ],
        },
      ]);
    });

    it('handles a base schema without properties', () => {
      const schemas = [
        { namespace: 'manifest' },
        {
          namespace: 'privacy.network',
          properties: { networkPredictionEnabled: {} },
        },
        { namespace: 'privacy', permissions: ['privacy'] },
        {
          namespace: 'privacy.websites',
          properties: { thirdPartyCookiesAllowed: {} },
        },
      ];
      expect(foldSchemas(schemas)).toEqual([
        { namespace: 'manifest' },
        {
          namespace: 'privacy',
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
        {
          namespace: 'privacy.network',
          properties: { networkPredictionEnabled: {} },
        },
        {
          namespace: 'privacy.websites',
          properties: { thirdPartyCookiesAllowed: {} },
        },
      ];
      expect(foldSchemas(schemas)).toEqual([
        { namespace: 'manifest' },
        {
          namespace: 'privacy',
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
        {
          namespace: 'alarms',
          permissions: ['alarms'],
          properties: {},
        },
      ];
      const expectedSchemas = schemas.map((schema) => ({ ...schema }));
      expect(foldSchemas(schemas)).toEqual(expectedSchemas);
    });

    it('throws if there is more than two levels of nesting', () => {
      const schemas = [
        {
          namespace: 'devtools.panels.sidebars',
          properties: { createSidebar: {} },
        },
      ];
      expect(() => foldSchemas(schemas)).toThrow(
        /may only have one level of nesting/
      );
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

  describe('$import', () => {
    it('rewrites a $import to a $merge', () => {
      const schemaWithImport = [
        {
          namespace: 'manifest',
          types: [
            {
              id: 'ManifestBase',
              properties: { name: { type: 'string' } },
            },
            {
              id: 'WebExtensionManifest',
              $import: 'ManifestBase',
              properties: { something: { type: 'boolean' } },
            },
          ],
        },
      ];
      const result = inner.loadSchema(schemaWithImport, 'dollar-import.json');
      expect(result).toEqual([
        {
          id: 'dollar-import',
          definitions: {},
          refs: {},
          types: {
            ManifestBase: {
              properties: { name: { type: 'string' } },
              required: ['name'],
            },
            WebExtensionManifest: {
              $merge: {
                source: { $ref: 'dollar-import#/types/ManifestBase' },
                with: {
                  properties: { something: { type: 'boolean' } },
                  required: ['something'],
                },
              },
            },
          },
        },
      ]);
    });
  });

  describe('propagateManifestVersionRestrictions', () => {
    const testCases = [
      {
        testName: 'propagates max_manifest_version',
        schemaId: 'page_action',
        schemaInput: [
          {
            namespace: 'manifest',
            max_manifest_version: 2,
            types: [
              {
                $extend: 'WebExtensionManifest',
                properties: {
                  page_action: {
                    type: 'object',
                  },
                },
              },
            ],
          },
        ],
        expectedOutput: {
          definitions: {
            WebExtensionManifest: {
              properties: {
                page_action: {
                  type: 'object',
                  max_manifest_version: 2,
                },
              },
            },
          },
        },
      },
      {
        testName: 'propagates min_manifest_version',
        schemaId: 'action',
        schemaInput: [
          {
            namespace: 'manifest',
            min_manifest_version: 3,
            types: [
              {
                $extend: 'WebExtensionManifest',
                properties: {
                  action: {
                    type: 'object',
                  },
                },
              },
            ],
          },
        ],
        expectedOutput: {
          definitions: {
            WebExtensionManifest: {
              properties: {
                action: {
                  type: 'object',
                  min_manifest_version: 3,
                },
              },
            },
          },
        },
      },
      {
        testName: 'propagates min_manifest_version into a $ref property',
        schemaId: 'fakeApi',
        schemaInput: [
          {
            namespace: 'manifest',
            min_manifest_version: 3,
            types: [
              {
                $extend: 'WebExtensionManifest',
                properties: {
                  manifestPropWithRef: {
                    $ref: 'SomeReferencedType',
                  },
                },
              },
            ],
          },
        ],
        expectedOutput: {
          definitions: {
            WebExtensionManifest: {
              properties: {
                manifestPropWithRef: {
                  allOf: [
                    {
                      $ref: 'manifest#/types/SomeReferencedType',
                    },
                    {
                      min_manifest_version: 3,
                    },
                  ],
                },
              },
            },
          },
        },
      },
      {
        testName: 'does only propagates for api extended manifest definitions',
        schemaId: 'fakeApi',
        schemaInput: [
          {
            namespace: 'fakeApi',
            min_manifest_version: 3,
            types: [
              {
                $extend: 'SomeOtherType',
                properties: {
                  propName: { type: 'object' },
                },
              },
            ],
          },
        ],
        expectedOutput: {
          definitions: {
            SomeOtherType: {
              properties: {
                propName: { type: 'object' },
              },
            },
          },
        },
      },
    ];

    it.each(
      testCases.map(({ testName, schemaId, schemaInput, expectedOutput }) => [
        testName,
        schemaId,
        schemaInput,
        expectedOutput,
      ])
    )('%s', (testName, schemaId, schemaInput, expectedOutput) => {
      expect(rewriteExtend(schemaInput, schemaId)).toEqual(
        expect.objectContaining(expectedOutput)
      );
    });
  });
});
