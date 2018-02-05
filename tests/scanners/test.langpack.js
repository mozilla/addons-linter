import Linter from 'linter';
import LangpackScanner from 'scanners/langpack';
import PropertiesParser from 'parsers/properties';
import DoctypeParser from 'parsers/doctype';
import FluentParser from 'parsers/fluent';


describe('LangpackScanner', () => {
  it('should report a proper scanner name', () => {
    expect(LangpackScanner.scannerName).toEqual('langpack');
  });

  it('should scan property files', async () => {
    const code = 'foo = bar';
    const langpackScanner = new LangpackScanner(code, 'foo.properties');

    sinon.spy(PropertiesParser.prototype, 'parse');

    const { linterMessages } = await langpackScanner.scan();
    expect(linterMessages.length).toEqual(0);
    expect(PropertiesParser.prototype.parse.calledOnce).toBeTruthy();
  });

  it('should scan dtd files', async () => {
    const code = '<!ENTITY foo "bar">';
    const langpackScanner = new LangpackScanner(code, 'foo.dtd');

    sinon.spy(DoctypeParser.prototype, 'parse');

    const { linterMessages } = await langpackScanner.scan();
    expect(linterMessages.length).toEqual(0);
    expect(DoctypeParser.prototype.parse.calledOnce).toBeTruthy();
  });

  it('should scan fluent files', async () => {
    const code = 'foo = Hello World';
    const langpackScanner = new LangpackScanner(code, 'foo.ftl');

    sinon.spy(FluentParser.prototype, 'parse');

    const { linterMessages } = await langpackScanner.scan();
    expect(linterMessages.length).toEqual(0);
    expect(FluentParser.prototype.parse.calledOnce).toBeTruthy();
  });

  it('should throw an error on unsupported file types', async () => {
    const langpackScanner = new LangpackScanner('', 'foo.js');

    await expect(langpackScanner.scan()).rejects.toThrow('Unsupported file type');
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
