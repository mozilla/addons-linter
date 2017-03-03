import {
  inner,
  loadTypes,
  processSchemas,
  rewriteExtend,
  rewriteKey,
  rewriteOptionalToRequired,
  rewriteValue,
} from 'schema/firefox-schemas';

describe('firefox schema import', () => {
  let sandbox;

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

    it('strips flags from patterns', () => {
      assert.equal(rewriteValue('pattern', '(?i)^abc$'), '^abc$');
      assert.equal(rewriteValue('pattern', '^foo(?i)bar$'), '^foo(?i)bar$');
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
        inner.normalizeSchema(schemas),
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

    it('handles a single schema in the array', () => {
      const schemas = [
        {
          namespace: 'manifest',
          types: [{ id: 'Permission', type: 'string' }],
        },
      ];
      assert.deepEqual(
        inner.normalizeSchema(schemas),
        {
          id: 'manifest',
          types: { Permission: { id: 'Permission', type: 'string' } },
          definitions: {},
          refs: {},
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
        .stub(inner, 'mapExtendToRef')
        .withArgs({
          manifest: { file: 'one', schema: { id: 'manifest', schema: 1 } },
          cookies: { file: 'two', schema: { id: 'cookies', schema: 2 } },
        })
        .returns({ mapExtendToRef: 'done' });
      sandbox
        .stub(inner, 'updateWithAddonsLinterData')
        .withArgs({ mapExtendToRef: 'done' })
        .returns({ updateWithAddonsLinterData: 'done' });
      assert.deepEqual(
        processSchemas([
          { file: 'one', schema: firstSchema },
          { file: 'two', schema: secondSchema },
        ]),
        { updateWithAddonsLinterData: 'done' });
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
});
