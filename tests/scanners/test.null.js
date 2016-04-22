import NullScanner from 'scanners/null';


describe('Null', function() {

  it('should do nothing', () => {
    var nullScanner = new NullScanner('', 'wat.txt');

    return nullScanner.scan()
      .then((linterMessages) => {
        assert.equal(linterMessages.length, 0);
      });
  });

});
