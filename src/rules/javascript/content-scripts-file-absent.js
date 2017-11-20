import { normalizePath } from "utils";
import { CONTENT_SCRIPT_NOT_FOUND } from 'messages/javascript';

export default {
  create(context) {
    const existingFiles = context.settings.existingFiles || {};
    return {
      Program(node) {
        const stringTokensIncludesContentScript = node.tokens.filter((token) => {
          return token.type === 'String' && token.value.match(/content_scripts.*?\.js/);
        });

        stringTokensIncludesContentScript.forEach((token) => {
          const trimmedFileName = normalizePath(token.value.replace(/["']/g, ''));
          if (!Object.prototype.hasOwnProperty.call(existingFiles, trimmedFileName)) {
            return context.report({
              loc: token.loc,
              message: CONTENT_SCRIPT_NOT_FOUND.code,
            });
          }
          return null;
        });
      },
    };
  },
};
