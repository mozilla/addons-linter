const req = require.context('./', false, /\.json$/);
export default req.keys().map((key) => req(key));
