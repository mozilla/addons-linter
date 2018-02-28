import { oneLine } from 'common-tags';

import {
  getRootExpression,
  i18n,
} from 'utils';


describe('utils.getRootExpression()', () => {
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
    const root = utils.getRootExpression(node);

    expect(root.name).toEqual('pref');
  });
});

describe('utils.gettext()', () => {
  it('should return localizable message', () => {
    expect('This is a test').toEqual('This is a test');
    console.log(i18n.gettext);

    expect(i18n.gettext('This is a test')).toEqual('C\'est un test');
  });
});


describe('utils.getNodeReference()', () => {
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
    const val = utils.getNodeReference(context, ref);

    expect(val.name).toEqual('bar');
  });

  it('should return the name of the reference if not in scope', () => {
    const ref = { name: 'doesNotExist' };
    const val = utils.getNodeReference(context, ref);

    expect(val.name).toEqual(ref.name);
  });
});

describe('utils.getVariable()', () => {
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
    const foo = utils.getVariable(context, 'foo');
    expect(foo.type).toEqual('Literal');
    expect(foo.value).toEqual('bar');
  });

  it("should return undefined if the variable doesn't exist.", () => {
    const undef = utils.getVariable(context, 'doesNotExist');
    expect(typeof undef).toEqual('undefined');
  });

  it("should return undefined if the init property isn't on the parent", () => {
    const undef = utils.getVariable(contextWithoutParent, 'foo');
    expect(typeof undef).toEqual('undefined');
  });
});

describe('utils.checkOtherReferences', () => {
  const context = {
    getScope: () => {
      return {
        variables: [],
      };
    },
  };

  it('should return the node if reference is a Literal', () => {
    const literal = utils.getNodeReference(context, { type: 'Literal' });
    expect(literal.type).toEqual('Literal');
  });

  it('should return the node if reference is undefined', () => {
    const undef = utils.getNodeReference(context, { type: 'undefined' });
    expect(undef.type).toEqual('undefined');
  });
});

describe('utils.ensureFilenameExists()', () => {
  it('should throw error when filename is not a string', () => {
    expect(() => {
      utils.ensureFilenameExists();
    }).toThrow('Filename is required');
    expect(() => {
      utils.ensureFilenameExists(0);
    }).toThrow('Filename is required');
    expect(() => {
      utils.ensureFilenameExists(undefined);
    }).toThrow('Filename is required');
    expect(() => {
      utils.ensureFilenameExists(null);
    }).toThrow('Filename is required');
  });

  it('should throw error when filename is empty', () => {
    expect(() => {
      utils.ensureFilenameExists('');
    }).toThrow('Filename is required');
  });

  it('should accept filenames', () => {
    expect(() => {
      utils.ensureFilenameExists('foo.js');
      utils.ensureFilenameExists('0');
    }).not.toThrow();
  });
});


describe('utils.checkMinNodeVersion()', () => {
  it('should reject if version is not high enough', async () => {
    const fakeProcess = {
      version: 'v0.12.4',
    };
    await expect(
      utils.checkMinNodeVersion('0.12.7', fakeProcess)
    ).rejects.toThrow('Node version must be 0.12.7 or greater');
  });

  it('should not reject if version is not high enough', () => {
    const fakeProcess = {
      version: 'v4.1.2',
    };
    return utils.checkMinNodeVersion('0.12.7', fakeProcess);
  });
});

describe('utils.ignorePrivateFunctions()', () => {
  it('should return only "public" functions', () => {
    const listOfRuleFunctions = {
      checkForEval: sinon.stub(),
      _parseEvalPossibility: sinon.stub(),
      checkForCurlyBraces: sinon.stub(),
      __checkForFunctions: sinon.stub(),
      i_am_an_underscore_function: sinon.stub(),
    };

    const publicFunctions = utils.ignorePrivateFunctions(listOfRuleFunctions);
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

    const publicFunctions = utils.ignorePrivateFunctions(listOfRuleFunctions);
    expect(typeof publicFunctions).toBe('object');
    expect(Object.keys(publicFunctions).length).toBe(0);
  });

  it('should return only functions', () => {
    const listOfRuleFunctions = {
      iAmARule: sinon.stub(),
      _privateMethod: sinon.stub(),
      IAMCONSTANT: 'foo',
    };

    const publicFunctions = utils.ignorePrivateFunctions(listOfRuleFunctions);
    Object.keys(publicFunctions).forEach((functionName) => {
      expect(typeof publicFunctions[functionName]).toEqual('function');
    });
  });
});


describe('utils.getPackageTypeAsString()', () => {
  it('should look up a package type when passed a number', () => {
    expect(utils.getPackageTypeAsString(2)).toEqual('PACKAGE_THEME');
  });

  it('should look up a package type when passed a string', () => {
    expect(utils.getPackageTypeAsString('2')).toEqual('PACKAGE_THEME');
  });

  it('should throw if given a non-existent package type value', () => {
    expect(() => {
      utils.getPackageTypeAsString(127);
    }).toThrow('Invalid package type constant "127"');
  });

  it('should throw if given a bogus package type value', () => {
    expect(() => {
      utils.getPackageTypeAsString('whatevs');
    }).toThrow('Invalid package type constant "whatevs"');
  });
});


describe('utils.isLocalUrl', () => {
  it('should not match remote urls', () => {
    expect(utils.isLocalUrl('http://foo.com')).toBeFalsy();
    expect(utils.isLocalUrl('https://foo.com')).toBeFalsy();
    expect(utils.isLocalUrl('ftp://foo.com')).toBeFalsy();
    expect(utils.isLocalUrl('//foo.com')).toBeFalsy();
  });

  it('should not match data uri', () => {
    expect(utils.isLocalUrl('data:image/gif;base64,R0' +
      'lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7')).toBeFalsy();
  });

  it('should match chrome protocol', () => {
    expect(utils.isLocalUrl('chrome://bar/foo')).toBeTruthy();
  });

  it('should match resource protocol', () => {
    expect(utils.isLocalUrl('resource://bar/foo')).toBeTruthy();
  });

  it('should match non-remote urls starting with /', () => {
    expect(utils.isLocalUrl('/bar/foo')).toBeTruthy();
  });

  it('should match non-remote urls starting with alpha', () => {
    expect(utils.isLocalUrl('bar')).toBeTruthy();
  });
});


describe('utils.isBrowserNamespace', () => {
  it('is true for browser', () => {
    expect(utils.isBrowserNamespace('browser')).toEqual(true);
  });

  it('is true for chrome', () => {
    expect(utils.isBrowserNamespace('chrome')).toEqual(true);
  });

  it('is not true for other strings', () => {
    expect(utils.isBrowserNamespace('foo')).toEqual(false);
    expect(utils.isBrowserNamespace('bar')).toEqual(false);
    expect(utils.isBrowserNamespace('BROWSER')).toEqual(false);
    expect(utils.isBrowserNamespace('chrOme')).toEqual(false);
  });
});


describe('utils.parseCspPolicy', () => {
  it('should allow empty policies', () => {
    expect(utils.parseCspPolicy('')).toEqual({});
    expect(utils.parseCspPolicy(null)).toEqual({});
    expect(utils.parseCspPolicy(undefined)).toEqual({});
  });

  it('should parse directives correctly', () => {
    const rawPolicy = oneLine`
      default-src 'none'; script-src 'self'; connect-src https: 'self';
      img-src 'self'; style-src 'self';
    `;

    const parsedPolicy = utils.parseCspPolicy(rawPolicy);

    expect(parsedPolicy['script-src']).toEqual(['\'self\'']);
    expect(parsedPolicy['default-src']).toEqual(['\'none\'']);
    expect(parsedPolicy['connect-src']).toEqual(['https:', '\'self\'']);
    expect(parsedPolicy['img-src']).toEqual(['\'self\'']);
    expect(parsedPolicy['style-src']).toEqual(['\'self\'']);
  });

  it('should handle upper case correctly', () => {
    const parsedPolicy = utils.parseCspPolicy('DEFAULT-SRC \'NoNe\'');

    expect(parsedPolicy['default-src']).toEqual(['\'none\'']);
  });
});


describe('utils.normalizePath', () => {
  it('should normalize given "absolute" path to relative path', () => {
    expect(utils.normalizePath('/foo/bar/baz')).toEqual('foo/bar/baz');
  });

  it('should normalize ./ and ../ relative paths', () => {
    expect(utils.normalizePath('./foo/bar/baz')).toEqual('foo/bar/baz');
    expect(utils.normalizePath('qux/../foo/bar/baz')).toEqual('foo/bar/baz');
  });

  it('should normalize path with fragment identifier', () => {
    expect(utils.normalizePath('foo/bar/baz#qux')).toEqual('foo/bar/baz');
  });

  it('should not escape spaces within path', () => {
    expect(utils.normalizePath('foo/bar baz/qux')).toEqual('foo/bar baz/qux');
  });
});
