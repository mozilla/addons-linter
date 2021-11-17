import createHash from 'dispensary/hasher';

describe(__filename, () => {
  describe('createHash()', () => {
    it('should generate a sha256 hash', () => {
      expect(createHash('hasher')).toEqual(
        '9320ea11f6d427aec4949634dc8676136b2fa8cdad289d22659b44541abb8c51'
      );
    });
  });
});
