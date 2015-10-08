module.exports = {
  src: 'coverage/reports/**/*.json',
  options: {
    type: 'lcov',
    dir: 'coverage/reports',
    print: 'detail',
  },
};
