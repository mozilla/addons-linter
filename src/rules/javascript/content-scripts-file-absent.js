import * as path from 'path';

import { isBrowserNamespace } from 'utils';
import {
  CONTENT_SCRIPT_NOT_FOUND,
  CONTENT_SCRIPT_EMPTY,
} from 'messages/javascript';

module.exports = {
  create(context) {
    const existingFiles = Object.keys(context.settings.existingFiles || {}).map(
      (fileName) => {
        return path.resolve('/', fileName);
      }
    );

    return {
      MemberExpression(node) {
        if (
          !node.object.object ||
          !isBrowserNamespace(node.object.object.name)
        ) {
          // Early return when it's not our case.
          return;
        }
        const namespace = node.object.property.name;
        const property = node.property.name;
        // Namespace should be tabs function should be executeScript and it should be a call.
        // I.E. browser.tabs.executeScript().
        if (
          namespace !== 'tabs' ||
          property !== 'executeScript' ||
          node.parent.type !== 'CallExpression'
        ) {
          return;
        }
        node.parent.arguments.forEach((arg) => {
          // Skipping the argument if it's not an object.
          if (arg.type !== 'ObjectExpression') {
            return;
          }
          const fileProperty = arg.properties.find(
            (prop) => prop.key && prop.key.name === 'file'
          );
          const fileValue =
            fileProperty && fileProperty.value && fileProperty.value.value;
          // Skipping the argument if there is no file property, or value is not a static string.
          if (
            !fileProperty ||
            fileProperty.value.type !== 'Literal' ||
            typeof fileValue !== 'string'
          ) {
            return;
          }
          // If filename is empty, report an issue.
          if (fileValue === '') {
            context.report({
              loc: fileProperty.value.loc,
              message: CONTENT_SCRIPT_EMPTY.code,
            });
            return;
          }

          // We can't reliably validate relative file names because they
          // are resolved as relative to the current page url on Firefox
          // and the rule itself doesn't know the path of the html file (or
          // files) where the js file is going to be loaded, and so we chose
          // to validate only the absolute file paths to avoid false positive.
          // (Also note that Firefox and Chrome behave differently when
          // resolving relative content script paths used in a tabs.executeScript API call).
          if (!path.isAbsolute(fileValue)) {
            return;
          }

          const normalizedName = path.resolve('/', path.normalize(fileValue));

          // If file exists then we are good.
          if (existingFiles.includes(normalizedName)) {
            return;
          }

          // File not exists report an issue.
          context.report({
            loc: fileProperty.value.loc,
            message: CONTENT_SCRIPT_NOT_FOUND.code,
          });
        });
      },
    };
  },
};
