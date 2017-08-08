import Linter from 'linter';
import JSONScanner from 'scanners/json';

import { unexpectedSuccess } from '../helpers';


describe('JSONScanner', () => {
  it('should report a proper scanner name', () => {
    expect(JSONScanner.scannerName).toEqual('json');
  });

  it('should throw an error if getContents fails', () => {
    const addonsLinter = new Linter({ _: ['foo'] });
    const jsonScanner = new JSONScanner('{}', 'test.json', {
      collector: addonsLinter.collector,
    });

    sinon.stub(jsonScanner, 'getContents').callsFake(() => {
      return Promise.reject('Explode!');
    });

    return jsonScanner.scan()
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err).toEqual('Explode!');
      });
  });
});
