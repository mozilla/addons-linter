# Add-on Type Support [DRAFT]

Going forward the amo-validator will continue to be the linter for legacy addo-ns.
This document lists what types of addons the addon-linter will support and
provides somde details as to the scope of the features needed.

* Web Extensions
* Dictionaries
* Language Packs
* Search Add-ons

## Web Extensions

Required features for linting:

* Validation of the `manifest.json`. Swtich to JSON scheme for this.
* Look into rules for to guard against inadvertent privilege
  escalation holes. This type of issue would come from a site exploiting an
  extension.
* js validation of content scripts (Rules need TBD)
* Flag un-approved libs based on file name that match libs
* Skip JS linting on libs that match the approved list.
* Rules for specific APIs.

Nice to haves:

* Deal with aiding ports from Google Chrome + Opera.
* Determine if an API being used is missing a permission
* Determine if a Permission is begin asked for unnecessarily.

Docs: https://developer.mozilla.org/Add-ons/WebExtensions

## Dictionaries

* Validate `install.rdf`
* Deal with any other dictionary specific rules.

Docs: https://developer.mozilla.org/docs/Creating_a_spell_check_dictionary_add-on

## Lang Packs

* Validate `install.rdf`
* Validate `chrome.manifest`
* Deal with any other langpack specific rules.

Docs appear to be a bit thin on the ground for these. They need looking
into further and we shouldm look at the existing rules.

## Search Addons

What's needed?

* Validation of the opensearch xml

Old code is here https://github.com/mozilla/amo-validator/blob/master/validator/opensearch.py
