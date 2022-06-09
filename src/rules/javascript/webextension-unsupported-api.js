import { REMOVED_MV2_API, UNSUPPORTED_API } from 'messages/javascript';
import { hasBrowserApi, isMV2RemovedApi } from 'schema/browser-apis';
import { isBrowserNamespace } from 'utils';

const rule = {
  create(context) {
    return {
      MemberExpression(node) {
        const { addonMetadata, privileged } = context.settings;

        //
        // browser.name.space.prop()
        // ▲       ▲    ▲     ▲
        // │       └─┬──┘     └── property
        // │         │
        // │         └─────────── (nested) namespace
        // │
        // └───────────────────── top-level namespace (which we pass to
        //                        `inBrowserNamespace()` below)
        //
        if (
          !node.object ||
          !node.property ||
          // This is needed to find the "longest" namespace possible, otherwise
          // we'd match `browser.name` and `brower.name.space` in the example
          // above.
          node?.parent?.type === 'MemberExpression'
        ) {
          return;
        }

        // This should be the property called on the namespace.
        let property = node.property.name;

        // Attempt to find a nested namespace (but we limit the number of
        // iterations to avoid problems...), which will also limit the support
        // for long nested namespaces.
        const namespaces = [];
        let foundBrowserNamespace = false;
        for (
          let n = node.object, iter = 3;
          n.type === 'MemberExpression' && iter-- > 0 && !foundBrowserNamespace;
          n = n.object
        ) {
          // See: https://github.com/mozilla/addons-linter/issues/1309
          if (n.computed) {
            foundBrowserNamespace = false;
            break;
          }

          namespaces.push(n.property.name);
          foundBrowserNamespace = isBrowserNamespace(n.object.name);
        }

        if (!foundBrowserNamespace) {
          return;
        }

        // When we find an event handler, we should remove the event name from
        // the namespace and use it as the "property" because the "api" is
        // "<namespace>.<event>".
        if (
          ['addListener', 'removeListener', 'hasListener'].includes(property)
        ) {
          property = namespaces.shift();
        }

        // At this point, we should have all the namespace parts (in the
        // inverted order since we walked-up the AST), let's build the actual
        // namespace:
        const namespace = namespaces.reverse().join('.');
        const api = `${namespace}.${property}`;

        // Now here is the "trick": for non-privileged extensions, our code
        // only handles namespaces with a single "part" and there is test
        // coverage to ignore nested namespaces.
        if (!privileged && namespace !== namespaces.pop()) {
          return;
        }

        if (hasBrowserApi(namespace, property, addonMetadata)) {
          return;
        }

        if (isMV2RemovedApi(namespace, property, addonMetadata)) {
          context.report({
            node,
            message: REMOVED_MV2_API.messageFormat,
            data: { api },
          });
          return;
        }

        if (privileged && addonMetadata?.experimentApiPaths?.has(namespace)) {
          return;
        }

        context.report(node, UNSUPPORTED_API.messageFormat, { api });
      },
    };
  },
};

export default rule;
export const { create } = rule;
