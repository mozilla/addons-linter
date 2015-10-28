import { gettext as _, singleLineString } from 'utils';


export const DANGEROUS_CATEGORY = {
  code: 'DANGEROUS_CATEGORY',
  legacyCode: [
    'testcases_chromemanifest',
    'test_resourcemodules',
    'resource_modules',
  ],
  message: 'Potentially dangerous category entry',
  description: _(singleLineString`Add-ons defining global properties via
    category entries require careful review by an administrative reviewer.`),
  // TODO: signing_help is not yet used.
  signing_help: _(singleLineString`Given the potential security risks of
    exposing APIs to unprivileged code, extensions which use these APIs must
    undergo manual code review for at least one submission. If you are not
    using these APIs to interact with content code, please consider
    alternatives, such as JavaScript modules (http://mzl.la/1HMH2m9),
    CommonJS modules (http://mzl.la/1JBMjuU, http://mzl.la/1OBaE8u), the
    observer service (http://mzl.la/1MLqWdJ), or window listeners which
    install global properties on privileged windows`),
};
