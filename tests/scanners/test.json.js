import Linter from 'linter';
import JSONScanner from 'scanners/json';
import * as messages from 'messages';

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
      return Promise.reject(new Error('Explode!'));
    });

    return jsonScanner.scan()
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err.message).toEqual('Explode!');
      });
  });

  it('should use special parser for message.json', () => {
    const addonsLinter = new Linter({ _: ['foo'] });
    const jsonScanner = new JSONScanner('{ "blah": {} }', '_locales/en/messages.json', {
      collector: addonsLinter.collector,
    });

    return jsonScanner.scan().then(() => {
      const { errors } = addonsLinter.collector;
      expect(errors.length).toEqual(1);
      expect(errors[0].code).toEqual(messages.NO_MESSAGE.code);
      expect(errors[0].message).toEqual(messages.NO_MESSAGE.message);
    });
  });
});
