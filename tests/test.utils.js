import * as utils from 'utils';


describe('utils.endsWith()', function() {

  it('returns true if a string ends with a specified string', () => {
    assert.ok(utils.endsWith('Matthew', 'ew'));
  });

  it('returns false if a string does not end with a specified string', () => {
    assert.notOk(utils.endsWith('Matthew', 'Mac'));
  });

  it('returns true if a string ends with itself', () => {
    assert.ok(utils.endsWith('Matthew', 'Matthew'));
  });

  it('returns true if a strange character is present', () => {
    assert.ok(utils.endsWith('G chord! 🎸', '🎸'));
  });

  it("casts to strings if strings aren't used", () => {
    assert.ok(utils.endsWith(222, '22'));
    assert.ok(utils.endsWith('Hello!!11', 11));
  });
});

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
