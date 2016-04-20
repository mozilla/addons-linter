import HiddenScanner from 'scanners/hidden';


describe('Hidden', function() {

  it('should warn when finding a hidden file', () => {
    var hiddenScanner = new HiddenScanner('', 'wat.txt');

    return hiddenScanner.scan()
      .then((linterMessages) => {
        assert.equal(linterMessages.length, 1);
        assert.equal(linterMessages[0].code, 'HIDDEN_FILE');
        assert.equal(linterMessages[0].file, 'wat.txt');
      });
  });

});
