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
    expect(parser.parsedData.key67.attributes[0].value.elements[0].value).toEqual(
      'Sign In To &syncBrand.shortName.label;…'
    );
    expect(parser.parsedData.key67.attributes[1].value.elements[0].value).toEqual(
      'Y'
    );

    expect(parser.parsedData.key68.attributes[0].value.elements[0].value).toEqual(
      'Sync Now'
    );
    expect(parser.parsedData.key68.attributes[1].value.elements[0].value).toEqual(
      'S'
    );

    expect(parser.parsedData.key69.attributes[0].value.elements[0].value).toEqual(
      'Reconnect to &syncBrand.shortName.label;…'
    );
    expect(parser.parsedData.key69.attributes[1].value.elements[0].value).toEqual(
      'R'
    );
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
        Expected message "shared-photos" to have a value or attributes`,
    });
  });

  it('supports firefox 60 beta en-gb file', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const parser = new FluentParser(`
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

do-not-track-description = Send web sites a “Do Not Track” signal that you don’t want to be tracked
do-not-track-learn-more = Learn more
do-not-track-option-default =
    .label = Only when using Tracking Protection
do-not-track-option-always =
    .label = Always
pref-page =
    .title = { PLATFORM() ->
            [windows] Options
           *[other] Preferences
        }
# This is used to determine the width of the search field in about:preferences,
# in order to make the entire placeholder string visible
#
# Notice: The value of the .style attribute is a CSS string, and the width
# is the name of the CSS property. It is intended only to adjust the element's width.
# Do not translate.
search-input =
    .style = width: 15.4em
pane-general-title = General
category-general =
    .tooltiptext = { pane-general-title }
pane-search-title = Search
category-search =
    .tooltiptext = { pane-search-title }
pane-privacy-title = Privacy & Security
category-privacy =
    .tooltiptext = { pane-privacy-title }
# The word "account" can be translated, do not translate or transliterate "Firefox".
pane-sync-title = Firefox Account
category-sync =
    .tooltiptext = { pane-sync-title }
help-button-label = { -brand-short-name } Support
focus-search =
    .key = f
close-button =
    .aria-label = Close

## Browser Restart Dialog

feature-enable-requires-restart = { -brand-short-name } must restart to enable this feature.
feature-disable-requires-restart = { -brand-short-name } must restart to disable this feature.
should-restart-title = Restart { -brand-short-name }
should-restart-ok = Restart { -brand-short-name } now
revert-no-restart-button = Revert
restart-later = Restart Later`, addonLinter.collector);

    parser.parse();

    expect(parser.isValid).toEqual(true);
  });
});
