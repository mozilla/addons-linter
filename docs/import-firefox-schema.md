# How to import the most recent Firefox schema

We are trying to import the next major Firefox schema right after the beta merge. Check the [Firefox Release Calendar](https://wiki.mozilla.org/Release_Management/Calendar) for more details.

## Example import workflow

List the current Mercurial tags on mozilla-unified repository

    $ ./bin/list-firefox-tags 63
    bin/download-import-tag FIREFOX_63_0_BUILD1
    bin/download-import-tag FIREFOX_63_0b9_RELEASE
    bin/download-import-tag FIREFOX_63_0b9_BUILD1
    bin/download-import-tag FIREFOX_63_0b8_RELEASE
    bin/download-import-tag FIREFOX_63_0b8_BUILD1
    …
    bin/download-import-tag FIREFOX_63_0b14_RELEASE
    bin/download-import-tag FIREFOX_63_0b14_BUILD1
    …
    bin/download-import-tag FIREFOX_63_0b10_RELEASE
    bin/download-import-tag FIREFOX_63_0b10_BUILD1

Now download the most recent tag (this takes a while, releases are approx 370MB big)

    $ ./bin/download-import-tag FIREFOX_63_0b14_RELEASE

And import the schema.

    $ ./bin/firefox-schema-import tmp/FIREFOX_63_0b14_RELEASE.tar.gz

## Things to check for further updates

* Review the schema update carefully and see if there are any updates that require additional linting / warning from the linter (e.g properties that are meant for internal add-ons and shouldn't be used by regular add-ons, ask around if unsure)
* Check for custom format validations in ``src/schema/formats.js`` and update accordingly with upstream code (e.g ``manifestShortcutKey``)
