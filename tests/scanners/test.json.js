import Linter from 'linter';
import JSONScanner from 'scanners/json';


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
});
