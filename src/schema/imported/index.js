/*
  This is a hack to workaround our tests running with Jest.
  Jest does not provide `require.context` because dynamic imports don't work
  with it's --watch feature.

  So we're working around that and implementing `require.context` ourselves.
*/

/* istanbul ignore next */
if (typeof require.context === 'undefined') {
  const fs = require('fs');
  const path = require('path');

  require.context = function(
      base = '.', scanSubDirectories = false, regularExpression = /\.js$/) {
    const files = {};

    function readDirectory(directory) {
      fs.readdirSync(directory).forEach((file) => {
        const fullPath = path.resolve(directory, file);

        if (fs.statSync(fullPath).isDirectory()) {
          if (scanSubDirectories) {
            readDirectory(fullPath);
          }

          return;
        }

        if (!regularExpression.test(fullPath)) {
          return;
        }

        files[fullPath] = true;
      });
    }

    readDirectory(path.resolve(__dirname, base));

    function Module(file) {
      return require(file);
    }

    Module.keys = () => Object.keys(files);

    return Module;
  };
}

const req = require.context('./', false, /\.json$/);
export default req.keys().map((key) => req(key));
