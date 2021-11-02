import fs from 'fs';
import path from 'path';

import Updater from 'dispensary/updater';

describe(__filename, () => {
  const ROOT_DIR = path.join(__dirname, '..', '..', '..');
  const TEST_LIBRARIES_JSON_PATH = path.join(
    ROOT_DIR,
    'tests',
    'unit',
    'dispensary',
    'fixtures',
    'test_libraries.json'
  );

  function unexpectedSuccess() {
    return expect(false).toBe(true);
  }

  const fakeLibraries = [
    {
      name: 'myjslib',
      files: [
        {
          hash: '6657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6',
          fileOut: 'mylib.js',
          version: '1.0.2',
        },
        {
          hash: '4657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6',
          fileOut: 'mylib.min.js',
          version: '1.0.4',
        },
      ],
      versions: ['1.0.2', '1.0.4'],
    },
    {
      name: 'myotherlib',
      files: [
        {
          hash: '1657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6',
          fileOut: 'otherjs.js',
          version: '1.0.2',
        },
      ],
      versions: ['1.0.2'],
    },
  ];

  it('should output an error if something explodes', () => {
    const dispensary = new Updater();

    const fakeConsole = { error: () => {}, log: () => {} };
    const consoleErrorSpy = sinon.spy(fakeConsole, 'error');
    sinon.stub(dispensary, 'getLibraries').callsFake(() => {
      return Promise.reject(new Error('Error!'));
    });

    return dispensary
      .run(fakeConsole)
      .then(unexpectedSuccess)
      .catch((err) => {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(err.message).toEqual('Error!');
        // eslint-disable-next-line jest/no-conditional-expect
        expect(consoleErrorSpy.calledOnce).toBeTruthy();
      });
  });

  it('should send the update command and output', () => {
    const dispensary = new Updater({
      _: ['update'],
      libraries: TEST_LIBRARIES_JSON_PATH,
      pathToHashes: 'dist/hashes.txt',
    });

    const fakeConsole = { error: () => {}, log: () => {} };
    const consoleLogSpy = sinon.spy(fakeConsole, 'log');
    const updateSpy = sinon.spy(dispensary, 'updateCommand');

    sinon.stub(dispensary, '_getCachedHashes').callsFake(() => {
      return [];
    });

    return dispensary.run(fakeConsole).then(() => {
      expect(
        fs.readFileSync('dist/hashes.txt', 'utf8').split('\n').length
      ).toBe(21);
      expect(updateSpy.calledOnce).toBeTruthy();
      expect(consoleLogSpy.calledOnce).toBeTruthy();
      expect(
        consoleLogSpy.calledWith('hashes.txt updated successfully.')
      ).toBeTruthy();
    });
  });

  it('should error if there was a problem updating hashes', () => {
    const dispensary = new Updater({
      _: ['update'],
      libraries: TEST_LIBRARIES_JSON_PATH,
      pathToHashes: 'dist/hashes.txt',
    });

    const fakeConsole = { error: () => {}, log: () => {} };
    const fakeFS = {
      writeFile: (filename, contents, options, callback) => {
        callback(new Error('Fail!'));
      },
    };

    sinon.stub(dispensary, '_getCachedHashes').callsFake(() => {
      return [];
    });

    return dispensary
      .updateCommand([], fakeConsole, fakeFS)
      .then(unexpectedSuccess)
      .catch((err) => {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(err.message).toEqual('UpdateError: Error: Fail!');
        // eslint-disable-next-line jest/no-conditional-expect
        expect(err).toBeInstanceOf(Error);
      });
  });

  it('should return an array of hashes', () => {
    const dispensary = new Updater({
      libraries: TEST_LIBRARIES_JSON_PATH,
    });
    const fakeConsole = { error: () => {}, log: () => {} };

    sinon.stub(dispensary, '_getCachedHashes').callsFake(() => {
      return [];
    });

    return dispensary.run(fakeConsole).then((hashes) => {
      expect(hashes.length).toBe(20);
      expect(hashes).toBeInstanceOf(Array);
    });
  });

  it('should set files', () => {
    const dispensary = new Updater({
      libraries: TEST_LIBRARIES_JSON_PATH,
    });

    return dispensary
      .getLibraries()
      .then((libraries) => {
        return dispensary.getFiles(libraries);
      })
      .then((libraries) => {
        expect(libraries[0].name).toEqual('backbone');
        expect(libraries[0].files.length).toBe(24);
      });
  });

  it('should set hashes', () => {
    const dispensary = new Updater({
      libraries: TEST_LIBRARIES_JSON_PATH,
    });

    return dispensary
      .getLibraries()
      .then((libraries) => {
        return dispensary.getFiles(libraries);
      })
      .then((libraries) => {
        return dispensary.getHashes(libraries);
      })
      .then((libraries) => {
        expect(libraries[0].files.length).toBe(32);
        expect(
          libraries[0].files.filter((file) => {
            return file.hash.length > 0;
          }).length
        ).toBe(32);
      });
  });

  it('should try to read and parse the library file supplied', () => {
    const dispensary = new Updater({
      libraries: TEST_LIBRARIES_JSON_PATH,
    });
    expect(dispensary.libraryFile).toEqual(TEST_LIBRARIES_JSON_PATH);
    return dispensary.getLibraries().then((libraries) => {
      expect(libraries[0].versions).toContain('1.1.1');
      expect(Object.keys(libraries).length).toEqual(2);
    });
  });

  it('should fail if the library does not exist', () => {
    const dispensary = new Updater({
      libraries: 'whatever-foo-bar',
    });
    expect(dispensary.libraryFile).toEqual('whatever-foo-bar');

    return dispensary
      .getLibraries()
      .then(unexpectedSuccess)
      .catch((err) => {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(err).toBeInstanceOf(Error);
        // eslint-disable-next-line jest/no-conditional-expect
        expect(err.message).toEqual(
          'whatever-foo-bar does not exist or is not a file.'
        );
      });
  });

  it('should return cached libraries after first call to getLibraries', async () => {
    const dispensary = new Updater({
      libraries: TEST_LIBRARIES_JSON_PATH,
    });
    const spy = jest.spyOn(fs, 'readFileSync');

    await dispensary.getLibraries();
    expect(spy).toHaveBeenCalled();

    await dispensary.getLibraries();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should add cached hashes in outputHashes()', () => {
    const dispensary = new Updater({}, fakeLibraries);

    sinon.stub(dispensary, '_buildHashes').callsFake(() => {
      return [];
    });

    const cachedStub = sinon
      .stub(dispensary, '_getCachedHashes')
      .callsFake(() => {
        return [
          '1657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6 yui.2.7.0.mylib.js',
          '2657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6 yui.2.7.1.mylib.js',
        ];
      });

    return dispensary.outputHashes(fakeLibraries).then((hashes) => {
      expect(hashes).toBeInstanceOf(Array);
      expect(hashes.length).toBe(2);
      expect(hashes).toContain(
        '1657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6 yui.2.7.0.mylib.js'
      );
      expect(cachedStub.called).toEqual(true);
    });
  });

  it('should resolve with an array in outputHashes()', () => {
    const dispensary = new Updater({}, fakeLibraries);

    sinon.stub(dispensary, '_getCachedHashes').callsFake(() => {
      return [];
    });

    return dispensary.outputHashes(fakeLibraries).then((hashes) => {
      expect(hashes).toBeInstanceOf(Array);
      expect(hashes.length).toBe(3);
    });
  });

  it('should output hashes in the correct format', () => {
    const dispensary = new Updater({
      libraries: TEST_LIBRARIES_JSON_PATH,
    });

    const hashes = dispensary._buildHashes(fakeLibraries);
    expect(hashes).toBeInstanceOf(Array);
    expect(hashes.length).toBe(3);
    expect(hashes[0]).toEqual(
      '6657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6 myjslib.1.0.2.mylib.js'
    );
    expect(hashes[1]).toEqual(
      '4657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6 myjslib.1.0.4.mylib.min.js'
    );
  });

  // eslint-disable-next-line jest/no-done-callback
  it('should pass an error to callback on a bad request', (done) => {
    const testAssert = (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('Error: Fail');
      done();
    };
    const fakeRequest = {
      get: (params, callback) => {
        return callback(new Error('Fail'));
      },
    };

    const dispensary = new Updater();
    dispensary._getFile(
      {
        library: {
          url: 'http://nowhere.bad.idontexist/$VERSION-$FILENAME.js',
        },
        file: 'mylib.js',
        version: '1.1.2',
      },
      testAssert,
      fakeRequest
    );
  });

  // eslint-disable-next-line jest/no-done-callback
  it('should pass an error to callback on non-200 responseCode', (done) => {
    const testAssert = (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('ResponseError: 404');
      done();
    };
    const fakeRequest = {
      get: (params, callback) => {
        return callback(null, { statusCode: 404 });
      },
    };

    const dispensary = new Updater();
    dispensary._getFile(
      {
        library: {
          url: 'http://nowhere.bad.idontexist/$VERSION-$FILENAME.js',
        },
        file: 'mylib.js',
        version: '1.1.2',
      },
      testAssert,
      fakeRequest
    );
  });

  // eslint-disable-next-line jest/no-done-callback
  it('should pass an error to callback on empty responseCode', (done) => {
    const testAssert = (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('InvalidResponseError: undefined');
      done();
    };
    const fakeRequest = {
      get: (params, callback) => {
        return callback(null, {});
      },
    };

    const dispensary = new Updater();
    dispensary._getFile(
      {
        library: {
          url: 'http://nowhere.bad.idontexist/$VERSION-$FILENAME.js',
        },
        file: 'mylib.js',
        version: '1.1.2',
      },
      testAssert,
      fakeRequest
    );
  });

  it('should encounter a JSONError when library JSON is bad', () => {
    const fakeFS = {
      readFileSync: () => {
        return '{"bad": "jsonData"';
      },
    };
    const dispensary = new Updater({
      libraries: 'fake.json',
    });

    return dispensary
      .getLibraries(fakeFS)
      .then(unexpectedSuccess)
      .catch((err) => {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(err).toBeInstanceOf(Error);
        // eslint-disable-next-line jest/no-conditional-expect
        expect(err.message).toEqual('JSONError: fake.json is not valid JSON.');
      });
  });

  it('should use filenameOutput if present', () => {
    const dispensary = new Updater();
    const library = {
      filename: 'mylibrary-$VERSION.js',
      filenameOutput: 'mylibrary.js',
      versions: ['1.1.0', '1.1.1'],
    };
    const files = dispensary._getAllFilesFromLibrary(library, 2);

    expect(files).toEqual([
      {
        file: 'mylibrary-$VERSION.js',
        fileOut: 'mylibrary.js',
        index: 2,
        library,
        version: '1.1.0',
        minified: false,
      },
      {
        file: 'mylibrary-$VERSION.js',
        fileOut: 'mylibrary.js',
        index: 2,
        library,
        version: '1.1.1',
        minified: false,
      },
    ]);
  });

  it('should sort hashes output', () => {
    const dispensary = new Updater();
    sinon.stub(dispensary, '_getCachedHashes').callsFake(() => {
      return [];
    });

    const fakeUnsortedLibraries = [
      {
        name: 'myzlib',
        files: [
          {
            hash: '6657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6',
            fileOut: 'myzlib.js',
            version: '1.0.11',
          },
          {
            hash: '8657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6',
            fileOut: 'myzlib.min.js',
            version: '1.0.9',
          },
        ],
        versions: ['1.0.11', '1.0.9'],
      },
      {
        name: 'myalib',
        files: [
          {
            hash: '7657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6',
            fileOut: 'myalib.js',
            version: '1.1.99',
          },
        ],
        versions: ['1.1.99'],
      },
    ];

    return dispensary.outputHashes(fakeUnsortedLibraries).then((libraries) => {
      expect(libraries[0]).toEqual(
        '7657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6 myalib.1.1.99.myalib.js'
      );
      expect(libraries[1]).toEqual(
        '8657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6 myzlib.1.0.9.myzlib.min.js'
      );
      expect(libraries[2]).toEqual(
        '6657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6 myzlib.1.0.11.myzlib.js'
      );
    });
  });

  it('should construct the correct file download path', () => {
    const dispensary = new Updater();
    const library = {
      url: 'https://myserver.com/moment/moment/$VERSION/$FILENAME',
      urlMin: 'https://myserver.com/moment/moment/$VERSION/min/$FILENAME',
    };

    const file = {
      file: 'moment.js',
      fileOut: 'moment.js',
      library,
      version: '1.0.0',
      minified: false,
    };
    expect(dispensary._buildDownloadURL(file)).toEqual(
      'https://myserver.com/moment/moment/1.0.0/moment.js'
    );

    const fileMin = {
      file: 'moment.min.js',
      fileOut: 'moment.min.js',
      library,
      version: '1.0.0',
      minified: true,
    };
    expect(dispensary._buildDownloadURL(fileMin)).toEqual(
      'https://myserver.com/moment/moment/1.0.0/min/moment.min.js'
    );
  });
});
