import Linter from 'linter';
import LangpackScanner from 'scanners/langpack';

import { unexpectedSuccess } from '../helpers';


describe('LangpackScanner', () => {
  it('should report a proper scanner name', () => {
    expect(LangpackScanner.scannerName).toEqual('langpack');
  });

  it('should throw an error if getContents fails', () => {
    const addonsLinter = new Linter({ _: ['foo'] });
    const jsonScanner = new LangpackScanner('', 'test.properties', {
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
