import Linter from 'linter';
import JSONScanner from 'scanners/json';

import { unexpectedSuccess } from '../helpers';


describe('JSONScanner', function() {

  it('should throw an error if getContents fails', () => {
    var addonsLinter = new Linter({_: ['foo']});
    var jsonScanner = new JSONScanner('{}', 'test.json', {
      collector: addonsLinter.collector});

    sinon.stub(jsonScanner, 'getContents', () => {
      return Promise.reject('Explode!');
    });

    return jsonScanner.scan()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.equal(err, 'Explode!');
      });
  });

});
