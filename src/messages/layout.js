import { MAX_FILE_SIZE_TO_PARSE_MB } from 'const';
import { gettext as _, singleLineString } from 'utils';


export const DUPLICATE_XPI_ENTRY = {
  code: 'DUPLICATE_XPI_ENTRY',
  legacyCode: [
    'testcases_packagelayout',
    'test_layout_all',
    'duplicate_entries',
  ],
  message: _('Package contains duplicate entries'),
  description: _(singleLineString`The package contains multiple entries
    with the same name. This practice has been banned. Try unzipping
    and re-zipping your add-on package and try again.`),
};

export const BAD_ZIPFILE = {
  code: 'BAD_ZIPFILE',
  legacyCode: null,
  message: 'Corrupt ZIP file',
  description: _('We were unable to decompress the zip file.'),
};

export const TYPE_NO_INSTALL_RDF = {
  code: 'TYPE_NO_INSTALL_RDF',
  legacyCode: [
    'typedetection',
    'detect_type',
    'missing_install_rdf',
  ],
  message: _('install.rdf was not found'),
  description: _(singleLineString`The type should be determined by
    install.rdf if present. As there's no install.rdf, type detection
    will be attempted to be inferred by package layout.`),
};

export const TYPE_NO_MANIFEST_JSON = {
  code: 'TYPE_NO_MANIFEST_JSON',
  legacyCode: [
    'typedetection',
    'detect_type',
    'missing_manifest_json',
  ],
  message: _('manifest.json was not found'),
  description: _(singleLineString`The type should be determined by
    manifest.json if present. As there's no manifest.json, type detection
    will be attempted to be inferred by package layout.`),
};

export const MULITPLE_MANIFESTS = {
  code: 'MULITPLE_MANIFESTS',
  legacyCode: [
    'typedetection',
    'detect_type',
    'install_rdf_and_manifest_json',
  ],
  message: _('Both install_rdf and manifest.json found'),
  description: _(singleLineString`The type should be determined by
    manifest.json if present. Both install_rdf and manifest_json
    are defined.`),
};

export const TYPE_NOT_DETERMINED = {
  code: 'TYPE_NOT_DETERMINED',
  legacyCode: [
    'main',
    'test_package',
    'undeterminable_type',
  ],
  message: _('Unable to determine add-on type'),
  description: _(singleLineString`The type detection algorithm could not
    determine the type of the add-on.`),
};

export const FILE_TOO_LARGE = {
  code: 'FILE_TOO_LARGE',
  legacyCode: null,
  message: _('File is too large to parse.'),
  description: _(singleLineString`This file is not binary and is too large to
    parse. Files larger than ${MAX_FILE_SIZE_TO_PARSE_MB}MB will not be
    parsed. If your JavaScript file has a large list, consider removing the
    list and loading it as a separate JSON file instead.`),
};

export const HIDDEN_FILE = {
  code: 'HIDDEN_FILE',
  legacyCode: [
    'testcases_content',
    'test_packed_packages',
    'hidden_files',
  ],
  message: _('Hidden file flagged'),
  description: _(singleLineString`Hidden files complicate the
    review process and can contain sensitive information about the system that
    generated the add-on. Please modify the packaging process so that these
    files aren't included.`),
};

export const FLAGGED_FILE = {
  code: 'FLAGGED_FILE',
  legacyCode: [
    'testcases_content',
    'test_packaged_packages',
    'flagged_files',
  ],
  message: _('Flagged filename found'),
  description: _(singleLineString`Files were found that are either unnecessary
    or have been included unintentionally. They should be removed.`),
};

export const FLAGGED_FILE_EXTENSION = {
  code: 'FLAGGED_FILE_EXTENSION',
  legacyCode: [
    'testcases_content',
    'test_blacklisted_files',
    'disallowed_extension',
  ],
  message: _('Flagged file extensions found'),
  description: _(singleLineString`Files were found that are either unnecessary
    or have been included unintentionally. They should be removed.`),
};

export const FLAGGED_FILE_TYPE = {
  code: 'FLAGGED_FILE_TYPE',
  legacyCode: [
    'testcases_packagelayout',
    'test_blacklisted_files',
    'disallowed_file_type',
  ],
  message: _('Flagged file type found'),
  description: _(singleLineString`Files whose names end with flagged extensions
    have been found in the add-on. The extension of these files are flagged
    because they usually identify binary components. Please see
    https://bit.ly/review-policy for more information on the binary content
    review process.`),
};

export const ALREADY_SIGNED = {
  code: 'ALREADY_SIGNED',
  legacyCode: null,
  message: _('Package already signed'),
  description: _(singleLineString`Add-ons which are already signed will be
    re-signed when published on AMO. This will replace any existing signatures
    on the add-on.`),
};
