module.exports = {
  options: {
    require: [
      function() {
        /*eslint-disable */
        assert = require('chai').assert;
        sinon = require('sinon') //
        /*eslint-enable */
      },
    ],
    reporter: 'spec',
  },
  all: ['dist/tests.js'],
};
