import bunyan from 'bunyan';

export default bunyan.createLogger({
  name: 'AddonValidatorJS',
  stream: process.stdout,
  level: process.env.LOG_LEVEL || 'fatal',
});
