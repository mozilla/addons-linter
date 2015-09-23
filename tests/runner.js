// Webpack tests entry point. Bundles all the test files
// into a single file.

import 'babel-core/polyfill';

var context = require.context('.', true, /.*?test\..*?.js$/);
context.keys().forEach(context);
