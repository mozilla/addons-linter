import Linter from 'linter';
import JSONScanner from 'scanners/json';
import * as messages from 'messages';

describe('JSONScanner', () => {
  it('should report a proper scanner name', () => {
    expect(JSONScanner.scannerName).toEqual('json');
  });

  it('should throw an error if getContents fails', async () => {
    const addonsLinter = new Linter({ _: ['foo'] });
    const jsonScanner = new JSONScanner('{}', 'test.json', {
      collector: addonsLinter.collector,
    });

    sinon.stub(jsonScanner, 'getContents').callsFake(() => {
      return Promise.reject(new Error('Explode!'));
    });

    await expect(jsonScanner.scan()).rejects.toThrow('Explode!');
  });

  it('should report invalid JSON', async () => {
    const addonsLinter = new Linter({ _: ['foo'] });
    const jsonScanner = new JSONScanner('{ bar: undefined }', 'baz.json', {
      collector: addonsLinter.collector,
    });

    await jsonScanner.scan();

    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.JSON_INVALID.code);
    expect(errors[0].file).toEqual('baz.json');
    expect(errors[0].message).toEqual(messages.JSON_INVALID.message);
  });

  it('should use special parser for messages.json', async () => {
    const addonsLinter = new Linter({ _: ['foo'] });
    const jsonScanner = new JSONScanner(
      '{ "blah": {} }',
      '_locales/en/messages.json',
      {
        collector: addonsLinter.collector,
      }
    );

    await jsonScanner.scan();

    const { errors } = addonsLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.NO_MESSAGE.code);
    expect(errors[0].file).toEqual('_locales/en/messages.json');
    expect(errors[0].message).toEqual(messages.NO_MESSAGE.message);
  });
});
