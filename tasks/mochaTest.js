module.exports = {
  options: {
    require: [
      function() {
        assert = require('chai').assert;  // eslint-disable-line
      },
    ],
    reporter: 'spec',
  },
  all: ['tests/*.js'],
};
