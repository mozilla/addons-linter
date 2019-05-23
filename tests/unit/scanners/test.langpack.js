import Linter from 'linter/linter';
import LangpackScanner from 'scanners/langpack';
import PropertiesParser from 'parsers/properties';
import DoctypeParser from 'parsers/doctype';
import FluentParser from 'parsers/fluent';

describe('LangpackScanner', () => {
  it('should report a proper scanner name', () => {
    expect(LangpackScanner.scannerName).toEqual('langpack');
  });

  it('should scan property files', async () => {
    sinon.spy(PropertiesParser.prototype, 'parse');
    const code = 'foo = bar';
    const langpackScanner = new LangpackScanner(code, 'foo.properties');

    const { linterMessages } = await langpackScanner.scan();
    expect(linterMessages.length).toEqual(0);
    sinon.assert.calledOnce(PropertiesParser.prototype.parse);
  });

  it('should scan dtd files', async () => {
    sinon.spy(DoctypeParser.prototype, 'parse');
    const code = '<!ENTITY foo "bar">';
    const langpackScanner = new LangpackScanner(code, 'foo.dtd');

    const { linterMessages } = await langpackScanner.scan();
    expect(linterMessages.length).toEqual(0);
    sinon.assert.calledOnce(DoctypeParser.prototype.parse);
  });

  it('should scan fluent files', async () => {
    sinon.spy(FluentParser.prototype, 'parse');
    const code = 'foo = Hello World';
    const langpackScanner = new LangpackScanner(code, 'foo.ftl');

    const { linterMessages } = await langpackScanner.scan();
    expect(linterMessages.length).toEqual(0);
    sinon.assert.calledOnce(FluentParser.prototype.parse);
  });

  it('should throw an error on unsupported file types', async () => {
    const langpackScanner = new LangpackScanner('', 'foo.js');

    await expect(langpackScanner.scan()).rejects.toThrow(
      'Unsupported file type'
    );
  });

  it('should throw an error if getContents fails', async () => {
    const addonsLinter = new Linter({ _: ['foo'] });
    const langpackScanner = new LangpackScanner('', 'test.properties', {
      collector: addonsLinter.collector,
    });

    sinon.stub(langpackScanner, 'getContents').callsFake(() => {
      return Promise.reject(new Error('Explode!'));
    });

    await expect(langpackScanner.scan()).rejects.toThrow('Explode!');
  });
});
