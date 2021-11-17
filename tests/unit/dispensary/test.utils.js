import { urlFormat } from 'dispensary/utils';

describe(__filename, () => {
  describe('urlFormat()', () => {
    it('should throw an error if missing arguments', () => {
      const url = 'http://download.com/$VERSION/$FILENAME';

      expect(() => {
        urlFormat(url);
      }).toThrow();

      expect(() => {
        urlFormat(url, { filename: 'mylib.js' });
      }).toThrow();

      expect(() => {
        urlFormat(url, { version: '1.1.1' });
      }).toThrow();
    });

    it('should process $FILENAME and $VERSION recursively', () => {
      const result = urlFormat('http://download.net/$VERSION/$FILENAME', {
        filename: 'mylib-$VERSION.js',
        version: '1.1.1',
      });

      expect(result).toEqual('http://download.net/1.1.1/mylib-1.1.1.js');
    });
  });
});
