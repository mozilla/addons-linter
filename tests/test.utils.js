import * as utils from 'utils';


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
    // jscs:disable
    var output = utils.singleLineString`So here is us, on the
          ${raggedy} edge. Don't push ${me},
              			and I won't push ${you}.`;
    // jscs:enable
    assert.equal(output,
      'So here is us, on the raggedy edge. ' +
      "Don't push me, and I won't push you.");
  });

});


describe('utils.checkMinNodeVersion()', function() {

  it('should reject if version is not high enough', () => {
    var fakeProcess = {
      version: 'v0.12.4',
    };
    return utils.checkMinNodeVersion('0.12.7', fakeProcess)
      .then(utils.unexpectedSuccess)
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
      assert.equal(typeof(publicFunctions[functionName]), 'function');
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
