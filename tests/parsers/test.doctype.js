import { oneLine } from 'common-tags';

import Linter from 'linter';
import DoctypeParser from 'parsers/doctype';

describe('DoctypeParser', () => {
  it('should parse our doctype entities correctly', () => {
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

  it('should ignore invalid entities', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const dtdParser = new DoctypeParser(oneLine`
        <!ENTITY "foobar">
        <!ENTITY bar.foo "barfoo">`, addonLinter.collector);

    dtdParser.parse();

    expect(dtdParser.isValid).toEqual(true);
    expect(dtdParser.parsedData).toEqual({
      'bar.foo': 'barfoo',
    });
  });
});
