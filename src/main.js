import { getConfig } from 'cli';
import Linter from 'linter';
import log from 'logger';

/* istanbul ignore if */
if (!global._babelPolyfill) {
  require('babel-polyfill');
}


export function isRunFromCLI(_module=module) {
  return require.main === _module;
}

export function createInstance({
  config=getConfig({useCLI: isRunFromCLI()}).argv, runAsBinary=false,
} = {}) {
  log.level = config.logLevel;
  log.info('Creating new linter instance', { config: config });
  config.runAsBinary = runAsBinary;
  return new Linter(config);
}

export default Linter;
