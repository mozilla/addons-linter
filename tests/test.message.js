import { default as Message, fields } from 'message';

/*eslint no-unused-vars:0*/

describe('Message', function() {

  it('should throw on missing type', () => {
    assert.throws(() => {
      var MyMessage = new Message();
    }, Error, /Message type "undefined" is not/);
  });

  it('should throw on invalid type', () => {
    assert.throws(() => {
      var MyMessage = new Message('awooga');
    }, Error, /Message type "awooga" is not/);
  });

  it('should throw on incorrect signing_severity', () => {
    assert.throws(() => {
      var MyMessage = new Message('error',
        {signing_severity: 'whatever'});
    }, Error, /Severity "whatever" is not/);
  });

  it('should define all expected fields', () => {
    var fakeOpts = {};
    for (let field of fields) {
      fakeOpts[field] = field;
    }
    fakeOpts.signing_severity = 'medium';
    var MyMessage = new Message('error', fakeOpts);
    for (let field of fields) {
      if (field === 'signing_severity') {
        assert.equal(MyMessage.signing_severity, 'medium');
      } else {
        assert.equal(MyMessage[field], field);
      }
    }
  });

  it ("shouldn't define random opts", () => {
    var MyMessage = new Message('error', {random: 'foo'});
    assert.notEqual(MyMessage.random, 'foo');
  });

});

