import { oneLine } from 'common-tags';

import {
  buildI18nObject,
  checkMinNodeVersion,
  ensureFilenameExists,
  getNodeReference,
  getPackageTypeAsString,
  getRootExpression,
  getVariable,
  i18n,
  ignorePrivateFunctions,
  isBrowserNamespace,
  isLocalUrl,
  normalizePath,
  parseCspPolicy,
} from 'utils';


describe('getRootExpression()', () => {
  const node = {
    type: 'CallExpression',
    callee: { // <-- bar()
      type: 'MemberExpression',
      object: {
        type: 'CallExpression',
        callee: { // <-- foo()
          type: 'MemberExpression',
          object: {
            type: 'CallExpression',
            callee: { // <-- pref()
              type: 'Identifier',
              name: 'pref',
            },
          },
          property: {
            type: 'Identifier',
            name: 'foo',
          },
        },
      },
      property: {
        type: 'Identifier',
        name: 'bar',
      },
    },
  };

  it('should verify that the root node is what was expected', () => {
    const root = getRootExpression(node);

    expect(root.name).toEqual('pref');
  });
});

describe('gettext()', () => {
  it('should return localizable message', () => {
    expect(i18n.gettext('This is a test')).toEqual('This is a test');

    jest.doMock('utils', () => {
      return {
        // eslint-disable-next-line global-require
        i18n: buildI18nObject(require('../tests/fixtures/fr.js')),
      };
    });

    // eslint-disable-next-line global-require
    const mockedI18n = require('utils').i18n;

    expect(mockedI18n.gettext('This is a test')).toEqual('C\'est un test');

    // But messages where we don't have a translation are still original
    expect(mockedI18n.gettext('This is an untranslated test')).toEqual('This is an untranslated test');
  });

  it('should support unicode messages', () => {
    jest.doMock('utils', () => {
      return {
        // eslint-disable-next-line global-require
        i18n: buildI18nObject(require('../tests/fixtures/ja.js')),
      };
    });

    // eslint-disable-next-line global-require
    const mockedI18n = require('utils').i18n;

    expect(mockedI18n.gettext('This is a test')).toEqual('これはテストです');
  });
});


describe('getNodeReference()', () => {
  // Represents scope for following code:
  // const foo = window; foo = bar;
  const context = {
    getScope: () => {
      // TODO: Look into generating these AST nodes using ESPrima
      return {
        variables: [{
          name: 'foo', // Reference name
          type: 'Identifier',
          defs: [{
            parent: {
              parent: {
                body: [{
                  type: 'VariableDeclaration',
                  declarations: [{
                    init: {
                      name: 'window',
                    },
                  }],
                }, {
                  type: 'ExpressionStatement',
                  expression: {
                    type: 'AssignmentExpression',
                    right: {
                      name: 'bar',
                    },
                  },
                },
                ],
              },
            },
          }],
        }],
      };
    },
  };

  it('should return the name of the referenced variable', () => {
    const ref = { name: 'foo' };
    const val = getNodeReference(context, ref);

    expect(val.name).toEqual('bar');
  });

  it('should return the name of the reference if not in scope', () => {
    const ref = { name: 'doesNotExist' };
    const val = getNodeReference(context, ref);

    expect(val.name).toEqual(ref.name);
  });
});

describe('getVariable()', () => {
  // This is the expected schema from eslint
  const context = {
    getScope: () => {
      return {
        variables: [{
          name: 'foo',
          defs: [{
            type: 'Variable',
            name: {
              parent: {
                init: {
                  type: 'Literal',
                  value: 'bar',
                },
              },
            },
          }],
        }],
      };
    },
  };

  const contextWithoutParent = {
    getScope: () => {
      return {
        variables: [{
          name: 'foo',
          defs: [{
            type: 'Variable',
            name: {},
          }],
        }],
      };
    },
  };

  it('should return the correct variable in the given context.', () => {
    const foo = getVariable(context, 'foo');
    expect(foo.type).toEqual('Literal');
    expect(foo.value).toEqual('bar');
  });

  it("should return undefined if the variable doesn't exist.", () => {
    const undef = getVariable(context, 'doesNotExist');
    expect(typeof undef).toEqual('undefined');
  });

  it("should return undefined if the init property isn't on the parent", () => {
    const undef = getVariable(contextWithoutParent, 'foo');
    expect(typeof undef).toEqual('undefined');
  });
});

describe('checkOtherReferences', () => {
  const context = {
    getScope: () => {
      return {
        variables: [],
      };
    },
  };

  it('should return the node if reference is a Literal', () => {
    const literal = getNodeReference(context, { type: 'Literal' });
    expect(literal.type).toEqual('Literal');
  });

  it('should return the node if reference is undefined', () => {
    const undef = getNodeReference(context, { type: 'undefined' });
    expect(undef.type).toEqual('undefined');
  });
});

describe('ensureFilenameExists()', () => {
  it('should throw error when filename is not a string', () => {
    expect(() => {
      ensureFilenameExists();
    }).toThrow('Filename is required');
    expect(() => {
      ensureFilenameExists(0);
    }).toThrow('Filename is required');
    expect(() => {
      ensureFilenameExists(undefined);
    }).toThrow('Filename is required');
    expect(() => {
      ensureFilenameExists(null);
    }).toThrow('Filename is required');
  });

  it('should throw error when filename is empty', () => {
    expect(() => {
      ensureFilenameExists('');
    }).toThrow('Filename is required');
  });

  it('should accept filenames', () => {
    expect(() => {
      ensureFilenameExists('foo.js');
      ensureFilenameExists('0');
    }).not.toThrow();
  });
});


describe('checkMinNodeVersion()', () => {
  it('should reject if version is not high enough', async () => {
    const fakeProcess = {
      version: 'v0.12.4',
    };
    await expect(
      checkMinNodeVersion('0.12.7', fakeProcess)
    ).rejects.toThrow('Node version must be 0.12.7 or greater');
  });

  it('should not reject if version is not high enough', () => {
    const fakeProcess = {
      version: 'v4.1.2',
    };
    return checkMinNodeVersion('0.12.7', fakeProcess);
  });
});

describe('ignorePrivateFunctions()', () => {
  it('should return only "public" functions', () => {
    const listOfRuleFunctions = {
      checkForEval: sinon.stub(),
      _parseEvalPossibility: sinon.stub(),
      checkForCurlyBraces: sinon.stub(),
      __checkForFunctions: sinon.stub(),
      i_am_an_underscore_function: sinon.stub(),
    };

    const publicFunctions = ignorePrivateFunctions(listOfRuleFunctions);
    expect(typeof publicFunctions).toBe('object');
    expect(Object.keys(publicFunctions).length).toBe(3);
    expect(Object.keys(publicFunctions)).not.toContain('_parseEvalPossibility');
    expect(Object.keys(publicFunctions)).not.toContain('__checkForFunctions');
  });

  it('should return an empty object when given only private functions', () => {
    const listOfRuleFunctions = {
      _parseEvalPossibility: sinon.stub(),
      __checkForFunctions: sinon.stub(),
    };

    const publicFunctions = ignorePrivateFunctions(listOfRuleFunctions);
    expect(typeof publicFunctions).toBe('object');
    expect(Object.keys(publicFunctions).length).toBe(0);
  });

  it('should return only functions', () => {
    const listOfRuleFunctions = {
      iAmARule: sinon.stub(),
      _privateMethod: sinon.stub(),
      IAMCONSTANT: 'foo',
    };

    const publicFunctions = ignorePrivateFunctions(listOfRuleFunctions);
    Object.keys(publicFunctions).forEach((functionName) => {
      expect(typeof publicFunctions[functionName]).toEqual('function');
    });
  });
});


describe('getPackageTypeAsString()', () => {
  it('should look up a package type when passed a number', () => {
    expect(getPackageTypeAsString(2)).toEqual('PACKAGE_THEME');
  });

  it('should look up a package type when passed a string', () => {
    expect(getPackageTypeAsString('2')).toEqual('PACKAGE_THEME');
  });

  it('should throw if given a non-existent package type value', () => {
    expect(() => {
      getPackageTypeAsString(127);
    }).toThrow('Invalid package type constant "127"');
  });

  it('should throw if given a bogus package type value', () => {
    expect(() => {
      getPackageTypeAsString('whatevs');
    }).toThrow('Invalid package type constant "whatevs"');
  });
});


describe('isLocalUrl', () => {
  it('should not match remote urls', () => {
    expect(isLocalUrl('http://foo.com')).toBeFalsy();
    expect(isLocalUrl('https://foo.com')).toBeFalsy();
    expect(isLocalUrl('ftp://foo.com')).toBeFalsy();
    expect(isLocalUrl('//foo.com')).toBeFalsy();
  });

  it('should not match data uri', () => {
    expect(isLocalUrl('data:image/gif;base64,R0' +
      'lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')).toBeFalsy();
  });

  it('should match chrome protocol', () => {
    expect(isLocalUrl('chrome://bar/foo')).toBeTruthy();
  });

  it('should match resource protocol', () => {
    expect(isLocalUrl('resource://bar/foo')).toBeTruthy();
  });

  it('should match non-remote urls starting with /', () => {
    expect(isLocalUrl('/bar/foo')).toBeTruthy();
  });

  it('should match non-remote urls starting with alpha', () => {
    expect(isLocalUrl('bar')).toBeTruthy();
  });
});


describe('isBrowserNamespace', () => {
  it('is true for browser', () => {
    expect(isBrowserNamespace('browser')).toEqual(true);
  });

  it('is true for chrome', () => {
    expect(isBrowserNamespace('chrome')).toEqual(true);
  });

  it('is not true for other strings', () => {
    expect(isBrowserNamespace('foo')).toEqual(false);
    expect(isBrowserNamespace('bar')).toEqual(false);
    expect(isBrowserNamespace('BROWSER')).toEqual(false);
    expect(isBrowserNamespace('chrOme')).toEqual(false);
  });
});


describe('parseCspPolicy', () => {
  it('should allow empty policies', () => {
    expect(parseCspPolicy('')).toEqual({});
    expect(parseCspPolicy(null)).toEqual({});
    expect(parseCspPolicy(undefined)).toEqual({});
  });

  it('should parse directives correctly', () => {
    const rawPolicy = oneLine`
      default-src 'none'; script-src 'self'; connect-src https: 'self';
      img-src 'self'; style-src 'self';
    `;

    const parsedPolicy = parseCspPolicy(rawPolicy);

    expect(parsedPolicy['script-src']).toEqual(['\'self\'']);
    expect(parsedPolicy['default-src']).toEqual(['\'none\'']);
    expect(parsedPolicy['connect-src']).toEqual(['https:', '\'self\'']);
    expect(parsedPolicy['img-src']).toEqual(['\'self\'']);
    expect(parsedPolicy['style-src']).toEqual(['\'self\'']);
  });

  it('should handle upper case correctly', () => {
    const parsedPolicy = parseCspPolicy('DEFAULT-SRC \'NoNe\'');

    expect(parsedPolicy['default-src']).toEqual(['\'none\'']);
  });
});


describe('normalizePath', () => {
  it('should normalize given "absolute" path to relative path', () => {
    expect(normalizePath('/foo/bar/baz')).toEqual('foo/bar/baz');
  });

  it('should normalize ./ and ../ relative paths', () => {
    expect(normalizePath('./foo/bar/baz')).toEqual('foo/bar/baz');
    expect(normalizePath('qux/../foo/bar/baz')).toEqual('foo/bar/baz');
  });

  it('should normalize path with fragment identifier', () => {
    expect(normalizePath('foo/bar/baz#qux')).toEqual('foo/bar/baz');
  });

  it('should not escape spaces within path', () => {
    expect(normalizePath('foo/bar baz/qux')).toEqual('foo/bar baz/qux');
  });
});
