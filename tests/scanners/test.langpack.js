import Linter from 'linter';
import LangpackScanner from 'scanners/langpack';
import PropertiesParser from 'parsers/properties';
import DoctypeParser from 'parsers/doctype';
import FluentParser from 'parsers/fluent';

import { unexpectedSuccess } from '../helpers';


describe('LangpackScanner', () => {
  it('should report a proper scanner name', () => {
    expect(LangpackScanner.scannerName).toEqual('langpack');
  });

  it('scan property files', () => {
    const spy = sinon.spy(PropertiesParser.prototype, 'parse');
    const code = 'foo = bar';
    const scanner = new LangpackScanner(code, 'foo.properties');

    return scanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
        sinon.assert.calledOnce(spy);
      });
  });

  it('scan dtd files', () => {
    const spy = sinon.spy(DoctypeParser.prototype, 'parse');
    const code = '<!ENTITY foo "bar">';
    const scanner = new LangpackScanner(code, 'foo.dtd');

    return scanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
        sinon.assert.calledOnce(spy);
      });
  });

  it('scan fluent files', () => {
    const spy = sinon.spy(FluentParser.prototype, 'parse');
    const code = 'foo = Hello World';
    const scanner = new LangpackScanner(code, 'foo.ftl');

    return scanner.scan()
      .then(({ linterMessages }) => {
        expect(linterMessages.length).toEqual(0);
        sinon.assert.calledOnce(spy);
      });
  });

  it('should throw an error if getContents fails', () => {
    const addonsLinter = new Linter({ _: ['foo'] });
    const langpackScanner = new LangpackScanner('', 'test.properties', {
      collector: addonsLinter.collector,
    });

    sinon.stub(langpackScanner, 'getContents').callsFake(() => {
      return Promise.reject('Explode!');
    });

    return langpackScanner.scan()
      .then(unexpectedSuccess)
      .catch((err) => {
        expect(err).toEqual('Explode!');
      });
  });
});
