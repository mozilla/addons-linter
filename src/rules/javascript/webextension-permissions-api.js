import { permissionNeeded } from 'schema/browser-apis';
import { PERMISSIONS_API } from 'messages/javascript';
import { getParsedJSON } from 'parsers/manifestjson';
import { doesExistInPermissions } from 'utils';

export default {
  create(context) {
    return {
    // eslint-disable-next-line consistent-return
      MemberExpression(node) {
        if (node.object.object) {
          const namespace = node.object.property.name;
          const property = node.property.name;
          const permissionsNeeded = permissionNeeded(namespace, property);
          const contents = getParsedJSON();
          const permissionsNotTaken = doesExistInPermissions(permissionsNeeded, contents);
          if (permissionsNotTaken) {
            for (let i = 0; i < permissionsNotTaken.length; i++) {
              context.report(node, `${namespace} ${PERMISSIONS_API.messageFormat}` +
              `${permissionsNotTaken[i]} permission has not been taken`);
            }
          }
        }
      },
    };
  },
};
