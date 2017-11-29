import { isBrowserNamespace, normalizePath } from 'utils';
import { CONTENT_SCRIPT_NOT_FOUND, CONTENT_SCRIPT_EMPTY } from 'messages/javascript';

export default {
  create(context) {
    const existingFiles = context.settings.existingFiles || {};
    return {
      MemberExpression(node) {
        if (node.object.object && isBrowserNamespace(node.object.object.name)) {
          const namespace = node.object.property.name;
          const property = node.property.name;
          // namespace should be tabs function should be executeScript
          // i.e. browser.tabs.executeScript
          if (namespace === 'tabs' && property === 'executeScript') {
            /* eslint-disable no-restricted-syntax */
            for (const arg of node.parent.arguments) {
              // work with the argument if it is object
              if (arg.type === 'ObjectExpression') {
                const fileProperty = arg.properties.find((prop) => prop.key && prop.key.name === 'file');
                const fileValue = fileProperty && fileProperty.value && fileProperty.value.value;
                // continue validation if file property is not a static string
                if (fileProperty && fileProperty.value.type === 'Literal' && typeof fileValue === 'string') {
                  // if filename is empty, report an issue
                  if (fileValue === '') {
                    context.report({
                      loc: fileProperty.value.loc,
                      message: CONTENT_SCRIPT_EMPTY.code,
                    });
                    return;
                  }
                  const normalizedName = normalizePath(fileValue);
                  // if file exists then we are good
                  if (!(normalizedName in existingFiles)) {
                    // file not exists report an issue
                    context.report({
                      loc: fileProperty.value.loc,
                      message: CONTENT_SCRIPT_NOT_FOUND.code,
                    });
                  }
                }
              }
            }
          }
        }
      },
    };
  },
};
