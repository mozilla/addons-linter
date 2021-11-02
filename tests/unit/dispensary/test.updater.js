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
    const updater = new Updater();

    const fakeConsole = { error: () => {}, log: () => {} };
    const consoleErrorSpy = sinon.spy(fakeConsole, 'error');
    sinon.stub(updater, 'getLibraries').callsFake(() => {
      return Promise.reject(new Error('Error!'));
    });

    return updater
      .run(fakeConsole)
      .then(unexpectedSuccess)
      .catch((err) => {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(err.message).toEqual('Error!');
        // eslint-disable-next-line jest/no-conditional-expect
        expect(consoleErrorSpy.calledOnce).toBeTruthy();
      });
  });

  it('should return an array of hashes', () => {
    const updater = new Updater({ libraryFile: TEST_LIBRARIES_JSON_PATH });
    const fakeConsole = { error: () => {}, log: () => {} };

    sinon.stub(updater, '_getCachedHashes').callsFake(() => {
      return [];
    });

    return updater.run(fakeConsole).then((hashes) => {
      // 14 = 2 * 4 versions for backbone + 1 * 6 versions for
      // backbone.localStorage (because there is no minified filename for it)
      expect(hashes.length).toBe(14);
      expect(hashes).toBeInstanceOf(Array);
    });
  });

  it('should set files', () => {
    const updater = new Updater({ libraryFile: TEST_LIBRARIES_JSON_PATH });

    return updater
      .getLibraries()
      .then((libraries) => {
        return updater.getFiles(libraries);
      })
      .then((libraries) => {
        expect(libraries[0].name).toEqual('backbone');
        expect(libraries[0].files.length).toBe(8);
        // No `filenameMinified` for this lib.
        expect(libraries[1].name).toEqual('backbone.localStorage');
        expect(libraries[1].files.length).toBe(6);
      });
  });

  it('should set hashes', () => {
    const updater = new Updater({ libraryFile: TEST_LIBRARIES_JSON_PATH });

    return updater
      .getLibraries()
      .then((libraries) => {
        return updater.getFiles(libraries);
      })
      .then((libraries) => {
        return updater.getHashes(libraries);
      })
      .then((libraries) => {
        expect(libraries[0].files.length).toBe(8);
        expect(
          libraries[0].files.filter((file) => {
            return file.hash.length > 0;
          }).length
        ).toBe(8);
      });
  });

  it('should try to read and parse the library file supplied', () => {
    const updater = new Updater({ libraryFile: TEST_LIBRARIES_JSON_PATH });
    expect(updater.libraryFile).toEqual(TEST_LIBRARIES_JSON_PATH);

    return updater.getLibraries().then((libraries) => {
      expect(libraries[0].versions).toContain('1.1.1');
      expect(Object.keys(libraries).length).toEqual(2);
    });
  });

  it('should fail if the library does not exist', () => {
    const updater = new Updater({ libraryFile: 'whatever-foo-bar' });
    expect(updater.libraryFile).toEqual('whatever-foo-bar');

    return updater
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
    const updater = new Updater({ libraryFile: TEST_LIBRARIES_JSON_PATH });
    const spy = jest.spyOn(fs, 'readFileSync');

    await updater.getLibraries();
    expect(spy).toHaveBeenCalled();

    await updater.getLibraries();
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('should add cached hashes in outputHashes()', () => {
    const updater = new Updater({ _libraries: fakeLibraries });

    sinon.stub(updater, '_buildHashes').callsFake(() => {
      return [];
    });

    const cachedStub = sinon.stub(updater, '_getCachedHashes').callsFake(() => {
      return [
        '1657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6 yui.2.7.0.mylib.js',
        '2657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6 yui.2.7.1.mylib.js',
      ];
    });

    return updater.outputHashes(fakeLibraries).then((hashes) => {
      expect(hashes).toBeInstanceOf(Array);
      expect(hashes.length).toBe(2);
      expect(hashes).toContain(
        '1657a7293da6afcd29e9243886725c8f90c8399e826dba9978e51a0a19e9bed6 yui.2.7.0.mylib.js'
      );
      expect(cachedStub.called).toEqual(true);
    });
  });

  it('should resolve with an array in outputHashes()', () => {
    const updater = new Updater({ _libraries: fakeLibraries });

    sinon.stub(updater, '_getCachedHashes').callsFake(() => {
      return [];
    });

    return updater.outputHashes(fakeLibraries).then((hashes) => {
      expect(hashes).toBeInstanceOf(Array);
      expect(hashes.length).toBe(3);
    });
  });

  it('should output hashes in the correct format', () => {
    const updater = new Updater({ libraryFile: TEST_LIBRARIES_JSON_PATH });

    const hashes = updater._buildHashes(fakeLibraries);
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
    const fakeFetch = () => Promise.reject(new Error('Fail'));

    const updater = new Updater();
    updater._getFile(
      {
        library: {
          url: 'http://nowhere.bad.idontexist/$VERSION-$FILENAME.js',
        },
        file: 'mylib.js',
        version: '1.1.2',
      },
      testAssert,
      fakeFetch
    );
  });

  // eslint-disable-next-line jest/no-done-callback
  it('should pass an error to callback on non-200 responseCode', (done) => {
    const testAssert = (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('ResponseError: 404');
      done();
    };
    const fakeFetch = () => Promise.resolve({ status: 404 });

    const updater = new Updater();
    updater._getFile(
      {
        library: {
          url: 'http://nowhere.bad.idontexist/$VERSION-$FILENAME.js',
        },
        file: 'mylib.js',
        version: '1.1.2',
      },
      testAssert,
      fakeFetch
    );
  });

  // eslint-disable-next-line jest/no-done-callback
  it('should pass an error to callback on empty responseCode', (done) => {
    const testAssert = (err) => {
      expect(err).toBeInstanceOf(Error);
      expect(err.message).toEqual('InvalidResponseError: undefined');
      done();
    };
    const fakeFetch = jest.fn(() => Promise.resolve({}));

    const updater = new Updater();
    updater._getFile(
      {
        library: {
          url: 'http://nowhere.bad.idontexist/$VERSION-$FILENAME.js',
        },
        file: 'mylib.js',
        version: '1.1.2',
      },
      testAssert,
      fakeFetch
    );
  });

  it('should encounter a JSONError when library JSON is bad', () => {
    const fakeFS = {
      readFileSync: () => {
        return '{"bad": "jsonData"';
      },
    };
    const updater = new Updater({
      libraryFile: 'fake.json',
    });

    return updater
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
    const updater = new Updater();
    const library = {
      filename: 'mylibrary-$VERSION.js',
      filenameOutput: 'mylibrary.js',
      versions: ['1.1.0', '1.1.1'],
    };
    const files = updater._getAllFilesFromLibrary(library, 2);

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
    const updater = new Updater();
    sinon.stub(updater, '_getCachedHashes').callsFake(() => {
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

    return updater.outputHashes(fakeUnsortedLibraries).then((libraries) => {
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
    const updater = new Updater();
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
    expect(updater._buildDownloadURL(file)).toEqual(
      'https://myserver.com/moment/moment/1.0.0/moment.js'
    );

    const fileMin = {
      file: 'moment.min.js',
      fileOut: 'moment.min.js',
      library,
      version: '1.0.0',
      minified: true,
    };
    expect(updater._buildDownloadURL(fileMin)).toEqual(
      'https://myserver.com/moment/moment/1.0.0/min/moment.min.js'
    );
  });
});
