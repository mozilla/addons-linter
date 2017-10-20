import { oneLine } from 'common-tags';

import Linter from 'linter';
import FluentParser from 'parsers/fluent';
import * as messages from 'messages';

import { assertHasMatchingError } from '../helpers';


describe('FluentParser', () => {
  it('should parse valid .ftl file correctly', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const parser = new FluentParser(`
choose-download-folder-title =
  {
    *[nominative] Foo
     [accusative] Foo2
  }`, addonLinter.collector);

    parser.parse();

    expect(parser.isValid).toEqual(true);
    expect(parser.parsedData).toEqual({
      'choose-download-folder-title': {
        val: [
          {
            def: 0,
            exp: null,
            type: 'sel',
            vars: [
              {
                key: {
                  name: 'nominative',
                  type: 'sym',
                },
                val: 'Foo',
              },
              {
                key: {
                  name: 'accusative',
                  type: 'sym',
                },
                val: 'Foo2',
              },
            ],
          },
        ],
      },
    });
  });

  it('support key assignments', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const parser = new FluentParser(`
key67
    .label = Sign In To &syncBrand.shortName.label;…
    .accesskey = Y
key68
    .label = Sync Now
    .accesskey = S
key69
    .label = Reconnect to &syncBrand.shortName.label;…
    .accesskey = R`, addonLinter.collector);

    parser.parse();

    expect(parser.isValid).toEqual(true);
    expect(parser.parsedData).toEqual({
      key67: {
        attrs: {
          accesskey: 'Y',
          label: 'Sign In To &syncBrand.shortName.label;…',
        },
        val: undefined,
      },
      key68: {
        attrs: {
          accesskey: 'S',
          label: 'Sync Now',
        },
        val: undefined,
      },
      key69: {
        attrs: {
          accesskey: 'R',
          label: 'Reconnect to &syncBrand.shortName.label;…',
        },
        val: undefined,
      },
    });
  });

  it('supports placeable', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const parser = new FluentParser(`
shared-photos =
  { $user_name } { $photo_count ->
      [0] hasn't added any photos yet
      [one] added a new photo
     *[other] added { $photo_count } new photos
  }.`, addonLinter.collector);

    parser.parse();

    expect(parser.isValid).toEqual(true);
    expect(parser.parsedData).toEqual({
      'shared-photos': {
        val: [
          {
            name: 'user_name',
            type: 'ext',
          },
          ' ',
          {
            def: 2,
            exp: {
              name: 'photo_count',
              type: 'ext',
            },
            type: 'sel',
            vars: [
              {
                key: {
                  type: 'num',
                  val: '0',
                },
                val: 'hasn\'t added any photos yet',
              },
              {
                key: {
                  name: 'one',
                  type: 'sym',
                },
                val: 'added a new photo',
              },
              {
                key: {
                  name: 'other',
                  type: 'sym',
                },
                val: [
                  'added ',
                  {
                    name: 'photo_count',
                    type: 'ext',
                  },
                  ' new photos',
                ],
              },
            ],
          },
          '.',
        ],
      },
    });
  });

  it('catches syntax errors and throws warnings', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const parser = new FluentParser('shared-photos =', addonLinter.collector);

    parser.parse();

    expect(parser.isValid).toEqual(false);
    assertHasMatchingError(addonLinter.collector.errors, {
      code: messages.FLUENT_INVALID.code,
      message: 'Your FTL is not valid.',
      description: oneLine`
        Expected a value (like: " = value") or an attribute
        (like: ".key = value")`,
    });
  });
});
