import bunyan from 'bunyan';


export function createLogger(_process=process) {
  var level = _process.env.LOG_LEVEL || 'fatal';
  var logLevels = Object.keys(bunyan.levelFromName);
  if (logLevels.indexOf(level) === -1) {
    throw new Error(`LOG_LEVEL must be one of ${logLevels.join(', ')}`);
  }
  return bunyan.createLogger({
    name: 'AddonValidatorJS',
    stream: process.stdout,
    level: level,
  });
}


export default createLogger();
