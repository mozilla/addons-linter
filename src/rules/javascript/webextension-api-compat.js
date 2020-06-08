import bcd from 'mdn-browser-compat-data';

import { INCOMPATIBLE_API } from 'messages/javascript';
import { createCompatibilityRule } from 'utils';
import { hasBrowserApi } from 'schema/browser-apis';

export default {
  create(context) {
    return createCompatibilityRule(
      'firefox',
      INCOMPATIBLE_API,
      context,
      bcd,
      hasBrowserApi
    );
  },
};
