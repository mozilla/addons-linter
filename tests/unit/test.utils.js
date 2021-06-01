import { oneLine } from 'common-tags';
import bcd from '@mdn/browser-compat-data';

import {
  AddonsLinterUserError,
  basicCompatVersionComparison,
  buildI18nObject,
  checkMinNodeVersion,
  ensureFilenameExists,
  errorParamsToUnsupportedVersionRange,
  firefoxStrictMinVersion,
  getNodeReference,
  getPackageTypeAsString,
  getRootExpression,
  getVariable,
  i18n,
  ignorePrivateFunctions,
  isBrowserNamespace,
  isCompatible,
  isLocalUrl,
  normalizePath,
  parseCspPolicy,
} from 'utils';

describe('getRootExpression()', () => {
  const node = {
    type: 'CallExpression',
    callee: {
      // <-- bar()
      type: 'MemberExpression',
      object: {
        type: 'CallExpression',
        callee: {
          // <-- foo()
          type: 'MemberExpression',
          object: {
            type: 'CallExpression',
            callee: {
              // <-- pref()
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
        i18n: buildI18nObject(require('../fixtures/fr')),
      };
    });

    // eslint-disable-next-line global-require
    const mockedI18n = require('utils').i18n;

    expect(mockedI18n.gettext('This is a test')).toEqual("C'est un test");

    // But messages where we don't have a translation are still original
    expect(mockedI18n.gettext('This is an untranslated test')).toEqual(
      'This is an untranslated test'
    );

    jest.resetModules();
  });

  it('should support unicode messages', () => {
    jest.doMock('utils', () => {
      return {
        // eslint-disable-next-line global-require
        i18n: buildI18nObject(require('../fixtures/ja')),
      };
    });

    // eslint-disable-next-line global-require
    const mockedI18n = require('utils').i18n;

    expect(mockedI18n.gettext('This is a test')).toEqual('これはテストです');

    jest.resetModules();
  });
});

describe('sprintf()', () => {
  it('should return localizable message for dynamic messages', () => {
    const path = '../fixtures/no-image.png';
    expect(
      i18n.sprintf(i18n._('Icon could not be found at "%(path)s".'), { path })
    ).toEqual('Icon could not be found at "../fixtures/no-image.png".');

    jest.doMock('utils', () => {
      return {
        // eslint-disable-next-line global-require
        i18n: buildI18nObject(require('../fixtures/de')),
      };
    });

    // eslint-disable-next-line global-require
    const mockedI18n = require('utils').i18n;
    expect(
      mockedI18n.sprintf(
        mockedI18n._("Icon could not be found at '%(path)s'."),
        { path }
      )
    ).toEqual(
      'Symbol konnte nicht unter „../fixtures/no-image.png“ gefunden werden.'
    );

    jest.resetModules();
  });
});

describe('getNodeReference()', () => {
  // Represents scope for following code:
  // const foo = window; foo = bar;
  const context = {
    getScope: () => {
      // TODO: Look into generating these AST nodes using ESPrima
      return {
        variables: [
          {
            name: 'foo', // Reference name
            type: 'Identifier',
            defs: [
              {
                parent: {
                  parent: {
                    body: [
                      {
                        type: 'VariableDeclaration',
                        declarations: [
                          {
                            init: {
                              name: 'window',
                            },
                          },
                        ],
                      },
                      {
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
              },
            ],
          },
        ],
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
        variables: [
          {
            name: 'foo',
            defs: [
              {
                type: 'Variable',
                name: {
                  parent: {
                    init: {
                      type: 'Literal',
                      value: 'bar',
                    },
                  },
                },
              },
            ],
          },
        ],
      };
    },
  };

  const contextWithoutParent = {
    getScope: () => {
      return {
        variables: [
          {
            name: 'foo',
            defs: [
              {
                type: 'Variable',
                name: {},
              },
            ],
          },
        ],
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
    await expect(checkMinNodeVersion('0.12.7', fakeProcess)).rejects.toThrow(
      'Node version must be 0.12.7 or greater'
    );
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
    expect(
      isLocalUrl(
        'data:image/gif;base64,R0' +
          'lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      )
    ).toBeFalsy();
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

    expect(parsedPolicy['script-src']).toEqual(["'self'"]);
    expect(parsedPolicy['default-src']).toEqual(["'none'"]);
    expect(parsedPolicy['connect-src']).toEqual(['https:', "'self'"]);
    expect(parsedPolicy['img-src']).toEqual(["'self'"]);
    expect(parsedPolicy['style-src']).toEqual(["'self'"]);
  });

  it('should handle upper case correctly', () => {
    const parsedPolicy = parseCspPolicy("DEFAULT-SRC 'NoNe'");

    expect(parsedPolicy['default-src']).toEqual(["'none'"]);
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

describe('firefoxStrictMinVersion', () => {
  it('should return null without applications key', () => {
    expect(firefoxStrictMinVersion({})).toEqual(null);
  });

  it('should return null without applications.gecko key', () => {
    expect(firefoxStrictMinVersion({ applications: null })).toEqual(null);
  });

  it('should return null without applications.gecko.strict_min_version key', () => {
    expect(firefoxStrictMinVersion({ applications: { gecko: null } })).toEqual(
      null
    );
  });

  it('should return the first number in applications.gecko.strict_min_version', () => {
    expect(
      firefoxStrictMinVersion({
        applications: { gecko: { strict_min_version: '6' } },
      })
    ).toEqual(6);
    expect(
      firefoxStrictMinVersion({
        applications: { gecko: { strict_min_version: '60.0a1' } },
      })
    ).toEqual(60);
  });
});

describe('basicCompatVersionComparison', () => {
  it('should return false when version added is a boolean', () => {
    expect(basicCompatVersionComparison(false, 60)).toBe(false);
  });

  it('should return false when version added is undefined', () => {
    expect(basicCompatVersionComparison(undefined, 60)).toBe(false);
  });

  it('should return true when version added is bigger than min version', () => {
    expect(basicCompatVersionComparison('61', 60)).toBe(true);
  });

  it('should return false when version added is smaller than min version', () => {
    expect(basicCompatVersionComparison('59', 60)).toBe(false);
  });
});

describe('isCompatible', () => {
  const getBCD = (data) => ({
    webextensions: {
      api: data,
    },
  });
  const getBCDForFeature = (
    supportData,
    { apiName = 'foo', appName = 'firefox' } = {}
  ) =>
    getBCD({
      [apiName]: { __compat: { support: { [appName]: supportData } } },
    });

  it('should be true if the given key path is not in the object', () => {
    expect(isCompatible(getBCD({}), 'foo.bar', 60, 'firefox')).toBe(true);
  });

  it('should be true if the given key path has a compatibility of false', () => {
    expect(
      isCompatible(
        getBCDForFeature({ version_added: false }),
        'foo',
        60,
        'firefox'
      )
    ).toBe(true);
  });

  it('should be true if the given key path is compatible with the minVersion', () => {
    expect(
      isCompatible(
        getBCDForFeature({ version_added: '60' }),
        'foo',
        60,
        'firefox'
      )
    ).toBe(true);
  });

  it('should be false if the given key path is incompatible with the minVersion', () => {
    const appName = 'firefox_android';
    expect(
      isCompatible(
        getBCDForFeature({ version_added: '61' }, { appName }),
        'foo',
        60,
        appName
      )
    ).toBe(false);
  });

  it('should fall back to deepest matching compat info', () => {
    expect(
      isCompatible(
        getBCDForFeature({ version_added: '61' }),
        'foo.bar',
        60,
        'firefox'
      )
    ).toBe(false);
  });

  it('should be compatible if no specific version is specified', () => {
    expect(
      isCompatible(
        getBCDForFeature({ version_added: true }),
        'foo.bar',
        60,
        'firefox'
      )
    ).toBe(true);
  });

  it('should be compatible if version is behind flag and no other version is available', () => {
    expect(
      isCompatible(
        getBCDForFeature({ flags: [], version_added: true }),
        'foo',
        60,
        'firefox'
      )
    ).toBe(true);
  });

  it('should be compatible if version is behind flag starting at a later release', () => {
    expect(
      isCompatible(
        getBCDForFeature({ flags: [], version_added: '61' }),
        'foo',
        60,
        'firefox'
      )
    ).toBe(true);
  });

  it('should be compatible with multiple support versions', () => {
    expect(
      isCompatible(
        getBCDForFeature([
          { version_added: '60' },
          { flags: [], version_added: '59' },
        ]),
        'foo',
        60,
        'firefox'
      )
    ).toBe(true);
  });

  it('should be incompatible with multiple support versions', () => {
    expect(
      isCompatible(
        getBCDForFeature([
          { version_added: '61' },
          { flags: [], version_added: '59' },
        ]),
        'foo',
        60,
        'firefox'
      )
    ).toBe(false);
  });

  it('should be compatible with oldest viable compat entry', () => {
    expect(
      isCompatible(
        getBCDForFeature([
          { version_added: '61' },
          { version_added: '60' },
          { flags: [], version_added: '59' },
        ]),
        'foo',
        60,
        'firefox'
      )
    ).toBe(true);
  });

  it('should report devtools.network.onRequestFinished as compatible for Firefox 60', () => {
    expect(
      isCompatible(bcd, 'devtools.network.onRequestFinished', 60, 'firefox')
    ).toBe(true);
  });

  it('should report devtools.network.onRequestFinished as incompatible for Firefox 59', () => {
    expect(
      isCompatible(bcd, 'devtools.network.onRequestFinished', 59, 'firefox')
    ).toBe(false);
  });

  it('should report runtime.getURL as compatible for Firefox 45', () => {
    expect(isCompatible(bcd, 'runtime.getURL', 45, 'firefox')).toBe(true);
  });

  it('should report runtime.getURL as incompatible for Firefox 44', () => {
    expect(isCompatible(bcd, 'runtime.getURL', 44, 'firefox')).toBe(false);
  });
});

describe('errorParamsToUnsupportedVersionRange', () => {
  it.each([
    ['< 3', { min_manifest_version: 3 }],
    ['> 2', { max_manifest_version: 2 }],
    [
      // This would not be actually used anywhere because each
      // schema validation would be only including one of them
      // and generate separate validation errors.
      '< 2, > 4',
      { min_manifest_version: 2, max_manifest_version: 4 },
    ],
    ['', {}],
    ['', null],
    ['', undefined],
  ])(
    'returns "%s" as version range string on error params %p',
    (expectedString, errorParams) => {
      expect(errorParamsToUnsupportedVersionRange(errorParams)).toEqual(
        expectedString
      );
    }
  );
});

describe('AddonsLinterUserError', () => {
  it('should be an instance of Error', () => {
    const error = new AddonsLinterUserError();
    expect(error instanceof Error).toStrictEqual(true);
  });

  it('should have name set to the expected error name', () => {
    const error = new AddonsLinterUserError();
    expect(error.name).toStrictEqual('AddonsLinterUserError');
  });

  it('should have message set to the expected string', () => {
    const errorMessage = 'Expected Error Message';
    const error = new AddonsLinterUserError(errorMessage);
    expect(error.message).toStrictEqual(errorMessage);
  });
});
