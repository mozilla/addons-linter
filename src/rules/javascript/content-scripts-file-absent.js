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
          if (namespace !== 'tabs' || property !== 'executeScript') return;
          node.parent.arguments.forEach((arg) => {
            // skip argument is not an object
            if (arg.type !== 'ObjectExpression') return;
            const fileProperty = arg.properties.find((prop) => prop.key && prop.key.name === 'file');
            const fileValue = fileProperty.value && fileProperty.value.value;
            // skip argument if file property is not a static string
            if (fileProperty.value.type !== 'Literal') return;
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
            if (normalizedName in existingFiles) return;
            // file not exists report an issue
            context.report({
              loc: fileProperty.value.loc,
              message: CONTENT_SCRIPT_NOT_FOUND.code,
            });
          });
        }
      },
    };
  },
};
