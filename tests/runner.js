// Webpack tests entry point. Bundles all the test files
// into a single file.

const context = require.context('.', true, /.*?test\..*?.js$/);
context.keys().forEach(context);
