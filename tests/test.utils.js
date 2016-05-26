import * as utils from 'utils';
import { unexpectedSuccess } from './helpers';


describe('utils.singleLineString()', function() {

  it('reduce a multiline template string into one string', () => {
    var output = utils.singleLineString`foo
              bar
        baz`;
    assert.equal(output, 'foo bar baz');
  });

  it('should still do subs', () => {
    var foo = 1;
    var bar = 2;
    var baz = 3;
    var output = utils.singleLineString`one ${foo}
              two ${bar}
        three ${baz}`;
    assert.equal(output, 'one 1 two 2 three 3');
  });

  it('should still work with tabs', () => {
    var me = 'me';
    var raggedy = 'raggedy';
    var you = 'you';
    var output = utils.singleLineString`So here is us, on the
          ${raggedy} edge. Don't push ${me},
              			and I won't push ${you}.`;
    assert.equal(output,
      'So here is us, on the raggedy edge. ' +
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

    assert.equal(root.name, 'pref');
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

    assert.equal(val.name, 'bar');
  });

  it('should return the name of the reference if not in scope', () => {
    var ref = { name: 'doesNotExist' };
    var val = utils.getNodeReference(context, ref);

    assert.equal(val.name, ref.name);
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

  it('should return the correct variable in the given context.', () => {
    var foo = utils.getVariable(context, 'foo');
    assert.equal(foo.type, 'Literal');
    assert.equal(foo.value, 'bar');
  });

  it("should return undefined if the variable doesn't exist.", () => {
    var undef = utils.getVariable(context, 'doesNotExist');
    assert.equal(typeof undef, 'undefined');
  });
});


describe('utils.ensureFilenameExists()', function() {

  it('should throw error when filename is not a string', () => {
    assert.throws(() => {
      utils.ensureFilenameExists();
    }, Error, 'Filename is required');
    assert.throws(() => {
      utils.ensureFilenameExists(0);
    }, Error, 'Filename is required');
    assert.throws(() => {
      utils.ensureFilenameExists(undefined);
    }, Error, 'Filename is required');
    assert.throws(() => {
      utils.ensureFilenameExists(null);
    }, Error, 'Filename is required');
  });

  it('should throw error when filename is empty', () => {
    assert.throws(() => {
      utils.ensureFilenameExists('');
    }, Error, 'Filename is required');
  });

  it('should accept filenames', () => {
    assert.doesNotThrow(() => {
      utils.ensureFilenameExists('foo.js');
      utils.ensureFilenameExists('0');
    }, Error);
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
        assert.include(err.message, 'Node version must be 0.12.7 or greater');
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
    assert.typeOf(publicFunctions, 'object');
    assert.lengthOf(Object.keys(publicFunctions), 3);
    assert.notInclude(Object.keys(publicFunctions), '_parseEvalPossibility');
    assert.notInclude(Object.keys(publicFunctions), '__checkForFunctions');
  });

  it('should return an empty object when given only private functions', () => {
    var listOfRuleFunctions = {
      _parseEvalPossibility: sinon.stub(),
      __checkForFunctions: sinon.stub(),
    };

    var publicFunctions = utils.ignorePrivateFunctions(listOfRuleFunctions);
    assert.typeOf(publicFunctions, 'object');
    assert.lengthOf(Object.keys(publicFunctions), 0);
  });

  it('should return only functions', () => {
    var listOfRuleFunctions = {
      iAmARule: sinon.stub(),
      _privateMethod: sinon.stub(),
      IAMCONSTANT: 'foo',
    };

    var publicFunctions = utils.ignorePrivateFunctions(listOfRuleFunctions);
    for (let functionName in publicFunctions) {
      assert.equal(typeof publicFunctions[functionName], 'function');
    }
  });

});


describe('utils.getPackageTypeAsString()', function() {

  it('should look up a package type when passed a number', () => {
    assert.equal(utils.getPackageTypeAsString(2), 'PACKAGE_THEME');
  });

  it('should look up a package type when passed a string', () => {
    assert.equal(utils.getPackageTypeAsString('2'), 'PACKAGE_THEME');
  });

  it('should throw if given a non-existent package type value', () => {
    assert.throws(() => {
      utils.getPackageTypeAsString(127);
    }, Error, 'Invalid package type constant "127"');
  });

  it('should throw if given a bogus package type value', () => {
    assert.throws(() => {
      utils.getPackageTypeAsString('whatevs');
    }, Error, 'Invalid package type constant "whatevs"');
  });

});


describe('utils.isLocalUrl', () => {

  it('should not match remote urls', () => {
    assert.notOk(utils.isLocalUrl('http://foo.com'));
    assert.notOk(utils.isLocalUrl('https://foo.com'));
    assert.notOk(utils.isLocalUrl('ftp://foo.com'));
    assert.notOk(utils.isLocalUrl('//foo.com'));
  });

  it('should not match data uri', () => {
    assert.notOk(utils.isLocalUrl('data:image/gif;base64,R0' +
      'lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'));
  });

  it('should match chrome protocol', () => {
    assert.ok(utils.isLocalUrl('chrome://bar/foo'));
  });

  it('should match resource protocol', () => {
    assert.ok(utils.isLocalUrl('resource://bar/foo'));
  });

  it('should match non-remote urls starting with /', () => {
    assert.ok(utils.isLocalUrl('/bar/foo'));
  });

  it('should match non-remote urls starting with alpha', () => {
    assert.ok(utils.isLocalUrl('bar'));
  });
});
