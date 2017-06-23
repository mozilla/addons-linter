import * as utils from 'utils';
import { unexpectedSuccess } from './helpers';


describe('utils.singleLineString()', function() {

  it('reduce a multiline template string into one string', () => {
    var output = utils.singleLineString`foo
              bar
        baz`;
    expect(output).toEqual('foo bar baz');
  });

  it('should still do subs', () => {
    var foo = 1;
    var bar = 2;
    var baz = 3;
    var output = utils.singleLineString`one ${foo}
              two ${bar}
        three ${baz}`;
    expect(output).toEqual('one 1 two 2 three 3');
  });

  it('should still work with tabs', () => {
    var me = 'me';
    var raggedy = 'raggedy';
    var you = 'you';
    var output = utils.singleLineString`So here is us, on the
          ${raggedy} edge. Don't push ${me},
              			and I won't push ${you}.`;
    expect(output).toEqual('So here is us, on the raggedy edge. ' +
    "Don't push me, and I won't push you.");
  });

});

describe('utils.getRootExpression()', function() {
  var node = {
    type: 'CallExpression',
    callee: { // <-- bar()
      type: 'MemberExpression',
      object: {
        type:'CallExpression',
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
    var root = utils.getRootExpression(node);

    expect(root.name).toEqual('pref');
  });
});

describe('utils.getNodeReference()', () => {
  // Represents scope for following code:
  // var foo = window; foo = bar;
  var context = {
    getScope: function() {
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
    var ref = { name: 'foo' };
    var val = utils.getNodeReference(context, ref);

    expect(val.name).toEqual('bar');
  });

  it('should return the name of the reference if not in scope', () => {
    var ref = { name: 'doesNotExist' };
    var val = utils.getNodeReference(context, ref);

    expect(val.name).toEqual(ref.name);
  });
});

describe('utils.getVariable()', function() {
  // This is the expected schema from eslint
  var context = {
    getScope: function() {
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

  var contextWithoutParent = {
    getScope: function() {
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
    var foo = utils.getVariable(context, 'foo');
    expect(foo.type).toEqual('Literal');
    expect(foo.value).toEqual('bar');
  });

  it("should return undefined if the variable doesn't exist.", () => {
    var undef = utils.getVariable(context, 'doesNotExist');
    expect(typeof undef).toEqual('undefined');
  });

  it("should return undefined if the init property isn't on the parent", () => {
    var undef = utils.getVariable(contextWithoutParent, 'foo');
    expect(typeof undef).toEqual('undefined');
  });
});

describe('utils.checkOtherReferences', function() {
  var context = {
    getScope: function() {
      return {
        variables: [],
      };
    },
  };

  it('should return the node if reference is a Literal', () => {
    var literal = utils.getNodeReference(context, {type: 'Literal'});
    expect(literal.type).toEqual('Literal');
  });

  it('should return the node if reference is undefined', () => {
    var undef = utils.getNodeReference(context, {type: 'undefined'});
    expect(undef.type).toEqual('undefined');
  });

});

describe('utils.ensureFilenameExists()', function() {

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


describe('utils.checkMinNodeVersion()', function() {

  it('should reject if version is not high enough', () => {
    var fakeProcess = {
      version: 'v0.12.4',
    };
    return utils.checkMinNodeVersion('0.12.7', fakeProcess)
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toContain('Node version must be 0.12.7 or greater');
      });
  });

  it('should not reject if version is not high enough', () => {
    var fakeProcess = {
      version: 'v4.1.2',
    };
    return utils.checkMinNodeVersion('0.12.7', fakeProcess);
  });

});

describe('utils.ignorePrivateFunctions()', function() {

  it('should return only "public" functions', () => {
    var listOfRuleFunctions = {
      checkForEval: sinon.stub(),
      _parseEvalPossibility: sinon.stub(),
      checkForCurlyBraces: sinon.stub(),
      __checkForFunctions: sinon.stub(),
      i_am_an_underscore_function: sinon.stub(),
    };

    var publicFunctions = utils.ignorePrivateFunctions(listOfRuleFunctions);
    expect(typeof publicFunctions).toBe('object');
    expect(Object.keys(publicFunctions).length).toBe(3);
    expect(Object.keys(publicFunctions)).not.toContain('_parseEvalPossibility');
    expect(Object.keys(publicFunctions)).not.toContain('__checkForFunctions');
  });

  it('should return an empty object when given only private functions', () => {
    var listOfRuleFunctions = {
      _parseEvalPossibility: sinon.stub(),
      __checkForFunctions: sinon.stub(),
    };

    var publicFunctions = utils.ignorePrivateFunctions(listOfRuleFunctions);
    expect(typeof publicFunctions).toBe('object');
    expect(Object.keys(publicFunctions).length).toBe(0);
  });

  it('should return only functions', () => {
    var listOfRuleFunctions = {
      iAmARule: sinon.stub(),
      _privateMethod: sinon.stub(),
      IAMCONSTANT: 'foo',
    };

    var publicFunctions = utils.ignorePrivateFunctions(listOfRuleFunctions);
    for (let functionName in publicFunctions) {
      expect(typeof publicFunctions[functionName]).toEqual('function');
    }
  });

});


describe('utils.getPackageTypeAsString()', function() {

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
