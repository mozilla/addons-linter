import createHash from 'sha.js';

import FileHasher from 'filehasher';

import { unexpectedSuccess } from './helpers';
import { singleLineString } from 'utils';


describe('FileHasher', function() {

  it('should load from src/hashes by default', () => {
    var hasher = new FileHasher();
    assert.equal(hasher._pathToHashes, './src/hashes.txt');
  });

  it('should flag a file found in hashes', () => {
    var jsFileContent = 'var foo = "I am a file!";';
    var hashMaker = new FileHasher();
    var jsHashes = {};
    jsHashes[hashMaker._makeHash(jsFileContent)] = 'myJSLib.js';

    var hasher = new FileHasher({ hashes: jsHashes });
    return hasher.matchesJSLibrary(jsFileContent)
      .then((hashResult) => {
        assert.isTrue(hashResult.matches);
        assert.equal(hashResult.name, 'myJSLib.js');
      });
  });

  it('should not flag a file not found in hashes', () => {
    var jsFileContent = 'var foo = "I am a file!";';
    var hashMaker = new FileHasher();
    var jsHashes = {};
    jsHashes[hashMaker._makeHash(`alert('Alerts annoy me.');`)] = 'myJSLib.js';

    var hasher = new FileHasher({ hashes: jsHashes });
    return hasher.matchesJSLibrary(jsFileContent)
      .then((hashResult) => {
        assert.isFalse(hashResult.matches);
        assert.equal(hashResult.name, null);
      });
  });

  it('should load cached hashes', () => {
    var hasher = new FileHasher();
    var hashesSpy = sinon.spy(hasher, '_loadHashesFromFile');

    var _hashesToCompare;

    return hasher.getHashes()
      .then((hashes) => {
        _hashesToCompare = hashes;
        assert.ok(hashesSpy.calledOnce);

        return hasher.getHashes();
      })
      .then((hashes) => {
        assert.deepEqual(_hashesToCompare, hashes);
        assert.ok(hashesSpy.calledOnce);
      });
  });

  it('should explode if path is invalid', () => {
    var hasher = new FileHasher({path: 'totallyNotReal'});

    return hasher.getHashes()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.equal(err.message, singleLineString`Path "totallyNotReal" is not
          a file or does not exist.`);
      });
  });

  it('should explode if path is invalid', () => {
    var hasher = new FileHasher({path: 'totallyNotReal'});

    return hasher.getHashes()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.equal(err.message, singleLineString`Path "totallyNotReal" is not
          a file or does not exist.`);
      });
  });

  it('should detect other errors during getHashes file problems', () => {
    var fakeError = new TypeError('soz');
    var fakeLstat = () => {
      return Promise.reject(fakeError);
    };

    var hasher = new FileHasher({lstat: fakeLstat});

    return hasher.getHashes()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, TypeError);
        assert.equal(err.message, 'soz');
      });
  });

  it('should reject if not a file', () => {
    var isFileSpy = sinon.spy(() => {
      return false;
    });
    var fakeLstat = () => {
      return Promise.resolve({isFile: isFileSpy});
    };

    var hasher = new FileHasher({path: 'totallyNotReal', lstat: fakeLstat});

    return hasher.getHashes()
      .then(unexpectedSuccess)
      .catch((err) => {
        assert.instanceOf(err, Error);
        assert.include(err.message,
                       'Path "totallyNotReal" is not a file or does not');
        assert.ok(isFileSpy.calledOnce);
      });
  });

  it('should create a SHA256 hash internally', () => {
    var hasher = new FileHasher();
    var hashString = 'super!';

    var fileHash = hasher._makeHash(hashString);
    var manualHash = createHash('sha256').update(hashString,
                                                 'utf8').digest('hex');

    assert.equal(fileHash, manualHash);
  });

});
