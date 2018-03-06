import { oneLine } from 'common-tags';

import { MAX_FILE_SIZE_TO_PARSE_MB } from 'const';
import { i18n } from 'utils';


export const DUPLICATE_XPI_ENTRY = {
  code: 'DUPLICATE_XPI_ENTRY',
  message: i18n._('Package contains duplicate entries'),
  description: i18n._(oneLine`The package contains multiple entries
    with the same name. This practice has been banned. Try unzipping
    and re-zipping your add-on package and try again.`),
};

export const BAD_ZIPFILE = {
  code: 'BAD_ZIPFILE',
  message: 'Corrupt ZIP file',
  description: i18n._('We were unable to decompress the zip file.'),
};

export const TYPE_NO_MANIFEST_JSON = {
  code: 'TYPE_NO_MANIFEST_JSON',
  message: i18n._('manifest.json was not found'),
  description: i18n._(oneLine`No manifest.json was found at the root of the extension.
    The package file must be a ZIP of the extension's files themselves, not of the
    containing directory. See: https://mzl.la/2r2McKv for more on packaging.`),
};

export const FILE_TOO_LARGE = {
  code: 'FILE_TOO_LARGE',
  message: i18n._('File is too large to parse.'),
  description: i18n._(oneLine`This file is not binary and is too large to
    parse. Files larger than ${MAX_FILE_SIZE_TO_PARSE_MB}MB will not be
    parsed. If your JavaScript file has a large list, consider removing the
    list and loading it as a separate JSON file instead.`),
};

export const HIDDEN_FILE = {
  code: 'HIDDEN_FILE',
  message: i18n._('Hidden file flagged'),
  description: i18n._(oneLine`Hidden files complicate the
    review process and can contain sensitive information about the system that
    generated the add-on. Please modify the packaging process so that these
    files aren't included.`),
};

export const FLAGGED_FILE = {
  code: 'FLAGGED_FILE',
  message: i18n._('Flagged filename found'),
  description: i18n._(oneLine`Files were found that are either unnecessary
    or have been included unintentionally. They should be removed.`),
};

export const FLAGGED_FILE_EXTENSION = {
  code: 'FLAGGED_FILE_EXTENSION',
  message: i18n._('Flagged file extensions found'),
  description: i18n._(oneLine`Files were found that are either unnecessary
    or have been included unintentionally. They should be removed.`),
};

export const FLAGGED_FILE_TYPE = {
  code: 'FLAGGED_FILE_TYPE',
  message: i18n._('Flagged file type found'),
  description: i18n._(oneLine`Files whose names end with flagged extensions
    have been found in the add-on. The extension of these files are flagged
    because they usually identify binary components. Please see
    https://bit.ly/review-policy for more information on the binary content
    review process.`),
};

export const ALREADY_SIGNED = {
  code: 'ALREADY_SIGNED',
  message: i18n._('Package already signed'),
  description: i18n._(oneLine`Add-ons which are already signed will be
    re-signed when published on AMO. This will replace any existing signatures
    on the add-on.`),
};

export const MOZILLA_COND_OF_USE = {
  code: 'MOZILLA_COND_OF_USE',
  message: i18n._('Violation of Mozilla conditions of use.'),
  description: i18n._(oneLine`Words found that violate the Mozilla
    conditions of use.
    See https://www.mozilla.org/en-US/about/legal/acceptable-use/ for more
    details.`),
};

export const COINMINER_USAGE_DETECTED = {
  code: 'COINMINER_USAGE_DETECTED',
  message: i18n._('Firefox add-ons are not allowed to run coin miners.'),
  description: i18n._(oneLine`We do not allow coinminer scripts to be run inside
    WebExtensions.
    See https://github.com/mozilla/addons-linter/issues/1643 for more
    details.`),
};
