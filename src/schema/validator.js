export default process.env.USE_FIREFOX_SCHEMAS
  ? require('./firefox-validator').default
  : require('./linter-validator').default;
