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

export const TYPE_INVALID = {
  code: 'TYPE_INVALID',
  legacyCode: [
    'typedetection',
    'detect_type',
    'invalid_em_type',
  ],
  message: _('Invalid <em:type> value'),
  description: _(singleLineString`The only valid values for <em:type>
    are 2, 4, 8, and 32. Any other values are either invalid or
    deprecated.`),
  filename: 'install.rdf',
};

export const TYPE_MISSING = {
  code: 'TYPE_MISSING',
  legacyCode: [
    'typedetection',
    'detect_type',
    'no_em:type',
  ],
  message: _('No <em:type> element found in install.rdf'),
  description: _(singleLineString`It isn't always required, but it is
    the most reliable method for determining add-on type.`),
  filename: 'install.rdf',
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

