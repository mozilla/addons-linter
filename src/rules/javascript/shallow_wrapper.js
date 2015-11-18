import { SHALLOW_WRAPPER } from 'messages';


// This rule is used for older add-ons (non-Jetpack I believe) but honestly
// it is a bit unclear as the MDN docs on XPCNativeWrapper seem to have moved
// to XRay: https://developer.mozilla.org/en-US/docs/Xray_vision
//
// TODO: Find out more about this rule.
export function shallow_wrapper(context) {
  function _testForShallowWrapper(node) {
    if (node.callee.name === 'XPCNativeWrapper' &&
        node.callee.type === 'Identifier') {

      if (node.arguments[0].type === 'Identifier' ||
          node.arguments[0].type === 'MemberExpression') {
        return context.report(node, SHALLOW_WRAPPER.code);
      }
    }
  }

  return {
    CallExpression: _testForShallowWrapper,
    NewExpression: _testForShallowWrapper,
  };
}
