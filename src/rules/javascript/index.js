import content_scripts_file_absent from './content-scripts-file-absent';
import global_require_arg from './global-require-arg';
import opendialog_nonlit_uri from './opendialog-nonlit-uri';
import opendialog_remote_uri from './opendialog-remote-uri';
import webextension_api from './webextension-api';
import webextension_api_compat from './webextension-api-compat';
import webextension_api_compat_android from './webextension-api-compat-android';
import webextension_deprecated_api from './webextension-deprecated-api';
import webextension_unsupported_api from './webextension-unsupported-api';

export default {
  'content-scripts-file-absent': content_scripts_file_absent,
  'global-require-arg': global_require_arg,
  'opendialog-nonlit-uri': opendialog_nonlit_uri,
  'opendialog-remote-uri': opendialog_remote_uri,
  'webextension-api': webextension_api,
  'webextension-api-compat': webextension_api_compat,
  'webextension-api-compat-android': webextension_api_compat_android,
  'webextension-deprecated-api': webextension_deprecated_api,
  'webextension-unsupported-api': webextension_unsupported_api,
};
