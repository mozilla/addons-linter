import { Foo } from 'main';

describe('Mocha es6 test', function() {

  it('should run a class with no probs', function() {
    var fooStub = sinon.stub();
    var joinStub = sinon.stub();
    var _unusedFoo = new Foo(fooStub, joinStub); //eslint-disable-line
    assert.ok(fooStub.called);
    assert.ok(joinStub.calledWithExactly('foo', 'bar'));
  });

});
