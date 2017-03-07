import firefoxValidate from './firefox-validator';
import linterValidate from './linter-validator';

export default process.env.USE_FIREFOX_SCHEMAS
  ? firefoxValidate
  : linterValidate;
