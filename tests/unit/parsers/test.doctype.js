import Linter from 'linter/linter';
import DoctypeParser from 'parsers/doctype';

describe('DoctypeParser', () => {
  it('should parse valid DTD file correctly', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const dtdParser = new DoctypeParser(
      '<!ENTITY foo.bar "foobar">',
      addonLinter.collector
    );

    dtdParser.parse();

    expect(dtdParser.isValid).toEqual(true);
    expect(dtdParser.parsedData).toEqual({
      'foo.bar': 'foobar',
    });
  });

  it('should parse lowercase entity specifiers', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const dtdParser = new DoctypeParser(
      '<!entity foo.bar "foobar">',
      addonLinter.collector
    );

    dtdParser.parse();

    expect(dtdParser.isValid).toEqual(true);
    expect(dtdParser.parsedData).toEqual({
      'foo.bar': 'foobar',
    });
  });

  it('should ignore invalid entities', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const dtdParser = new DoctypeParser(
      `
        <!ENTITY "foobar">
        <!ENTITY bar.foo "barfoo">`,
      addonLinter.collector
    );

    dtdParser.parse();

    expect(dtdParser.isValid).toEqual(true);
    expect(dtdParser.parsedData).toEqual({
      'bar.foo': 'barfoo',
    });
  });

  it('should overwrite duplicate entities', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const dtdParser = new DoctypeParser(
      `
        <!ENTITY foo 'bar'>
        <!ENTITY foo 'faz'>`,
      addonLinter.collector
    );

    dtdParser.parse();

    expect(dtdParser.isValid).toEqual(true);
    expect(dtdParser.parsedData).toEqual({
      foo: 'faz',
    });
  });

  it('should just ignore empty files', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const dtdParser = new DoctypeParser('', addonLinter.collector);
    dtdParser.parse();

    expect(dtdParser.isValid).toEqual(true);
    expect(dtdParser.parsedData).toEqual({});
  });

  it('should parse excessive line breaks correctly', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const dtdParser = new DoctypeParser(
      `
          <!ENTITY
          foo
          "bar">
          <!ENTITY
          abc.def
          "xyz">
          <!ENTITY
              fast
              'ball'>
          <!ENTITY
              two
              'per'
              ><!ENTITY line 'woot'>
          <!ENTITY

          this.is.a
          'test'>
          <!ENTITY overwrite
          'foo'>
          <!ENTITY overwrite 'bar'
        >
    `,
      addonLinter.collector
    );

    dtdParser.parse();

    expect(dtdParser.isValid).toEqual(true);
    expect(dtdParser.parsedData).toEqual({
      'abc.def': 'xyz',
      fast: 'ball',
      two: 'per',
      line: 'woot',
      'this.is.a': 'test',
      foo: 'bar',
      overwrite: 'bar',
    });
  });

  it('should ignore malformed lines but parse valid ones', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const dtdParser = new DoctypeParser(
      `
      <!ENTITY foo "bar">
      <!--Malformed line should not overwrite -->
      <!ENTITY< foo "oops">
      <!WHATEVER abc.def "xyz">
      <!ENTITY abc.def "xyz">
      <!ENTITY fast 'ball'>
      <!ENTITY two 'per'><!ENTITY line 'woot'>
      <!ENTITY this.is.a 'test'>
      <!ENTITY overwrite 'foo'>
      <!ENTITY overwrite 'bar'>
    `,
      addonLinter.collector
    );

    dtdParser.parse();

    expect(dtdParser.isValid).toEqual(true);
    expect(dtdParser.parsedData).toEqual({
      'abc.def': 'xyz',
      fast: 'ball',
      two: 'per',
      line: 'woot',
      'this.is.a': 'test',
      foo: 'bar',
      overwrite: 'bar',
    });
  });
});
