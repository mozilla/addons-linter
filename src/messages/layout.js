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
