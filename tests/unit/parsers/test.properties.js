import Linter from 'linter/linter';
import PropertiesParser from 'parsers/properties';

describe('PropertiesParser', () => {
  it('should parse valid .properties file correctly', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const propertiesParser = new PropertiesParser(
      `
      foo=bar
      abc.def = xyz
      #Comment
      fast=ball

      #Empty spaces

      this.is.a =test
      overwrite=foo
      overwrite=bar`,
      addonLinter.collector
    );

    propertiesParser.parse();

    expect(propertiesParser.isValid).toEqual(true);
    expect(propertiesParser.parsedData).toEqual({
      foo: 'bar',
      'abc.def': 'xyz',
      fast: 'ball',
      'this.is.a': 'test',
      overwrite: 'bar',
    });
  });

  it('should ignore invalid entities', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const propertiesParser = new PropertiesParser(
      `
        this should be ignored.
        foo=
        bar
        abc.def=x
        yz
        three.lines=a
        b
        c
        d`,
      addonLinter.collector
    );

    propertiesParser.parse();

    expect(propertiesParser.isValid).toEqual(true);
    expect(propertiesParser.parsedData).toEqual({
      foo: 'bar',
      'abc.def': 'xyz',
      'three.lines': 'abcd',
    });
  });
});
