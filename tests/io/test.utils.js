import { walkPromise } from 'io/utils';

describe('io.utils.walkPromise()', () => {
  it('should return the correct file data', async () => {
    const files = await walkPromise('tests/fixtures/io/');
    const fileNames = Object.keys(files);
    expect(fileNames).toContain('dir1/file1.txt');
    expect(fileNames).toContain('dir2/file2.txt');
    expect(fileNames).toContain('dir2/dir3/file3.txt');
  });

  it('should return the correct size data', async () => {
    const files = await walkPromise('tests/fixtures/io/');
    expect(files['dir1/file1.txt'].size).toEqual(2);
    expect(files['dir2/file2.txt'].size).toEqual(3);
    expect(files['dir2/dir3/file3.txt'].size).toEqual(4);
  });

  it('can be configured to not walk a directory', async () => {
    const files = await walkPromise(
      'tests/fixtures/io/', {
        shouldIncludePath: (filePath) => {
          return !filePath.startsWith('dir2');
        },
      });
    const fileNames = Object.keys(files);
    expect(fileNames).toContain('dir1/file1.txt');
    expect(fileNames).not.toContain('dir2/file2.txt');
    expect(fileNames).not.toContain('dir2/dir3/file3.txt');
  });

  it('can be configured to not include a file', async () => {
    const files = await walkPromise(
      'tests/fixtures/io/', {
        shouldIncludePath: (filePath) => {
          return filePath !== 'dir2/file2.txt';
        },
      });
    const fileNames = Object.keys(files);
    expect(fileNames).not.toContain('dir2/file2.txt');
    expect(fileNames).toContain('dir2/dir3/file3.txt');
  });

  it('can exclude the topmost directory', async () => {
    const files = await walkPromise(
      'tests/fixtures/io/', {
        shouldIncludePath: (filePath) => {
          // This would be the topmost directory.
          return filePath !== '';
        },
      });
    const fileNames = Object.keys(files);
    expect(fileNames).toEqual([]);
  });
});
