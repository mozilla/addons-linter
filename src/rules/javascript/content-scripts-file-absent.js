import { normalizePath } from 'utils';
import { CONTENT_SCRIPT_NOT_FOUND } from 'messages/javascript';

export default {
  create(context) {
    const existingFiles = context.settings.existingFiles || {};
    return {
      CallExpression(node) {
        if (node.callee.type === 'MemberExpression' &&
          node.callee.property &&
          node.callee.property.name === 'executeScript') {
          node.arguments.forEach((arg) => {
            if (arg.type !== 'ObjectExpression') return;

            const fileProperty = arg.properties.find((prop) => prop.key && prop.key.name === 'file');
            const fileValue = fileProperty && fileProperty.value.type === 'Literal' ? fileProperty.value.value : '';
            if (fileValue.match(/content_scripts.*\.js/)) {
              const normalizedName = normalizePath(fileValue);
              if (!Object.prototype.hasOwnProperty.call(existingFiles, normalizedName)) {
                context.report({
                  loc: fileProperty.value.loc,
                  message: CONTENT_SCRIPT_NOT_FOUND.code,
                });
              }
            }
          });
        }
      },
    };
  },
};
