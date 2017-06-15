import pino from 'pino';


export function createLogger(_process=process) {
  var level = _process.env.LOG_LEVEL || 'fatal';
  return pino({
    name: 'AddonLinterJS',
    level,
  }, process.stdout);
}


export default createLogger();
