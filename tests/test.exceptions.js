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
