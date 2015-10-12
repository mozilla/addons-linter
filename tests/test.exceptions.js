import * as exceptions from 'exceptions';


describe('DuplicateZipEntry()', function() {

  it('should have correct message', () => {
    assert.throws(() => {
      throw new exceptions.DuplicateZipEntryError('whatever');
    }, exceptions.DuplicateZipEntry, /whatever/);
  });

  it('should have correct message', () => {
    try {
      throw new exceptions.DuplicateZipEntryError('whatever');
    } catch (e) {
      assert.instanceOf(e, exceptions.DuplicateZipEntryError);
      assert.equal(e.message, 'whatever');
      assert.equal(e.name, 'DuplicateZipEntryError');
    }
  });

});


describe('ExtensibleError', function() {

  it('should assign Error.stack when no captureStackTrace', () => {
    class FakeError {
      constructor() {
        this.stack = 'fake-stack';
      }
    }

    var myException = new exceptions.ExtensibleError('Some message', FakeError);
    assert.equal(myException.stack, 'fake-stack');
    assert.equal(myException.message, 'Some message');
  });

});
