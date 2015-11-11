import { VALIDATION_ERROR } from 'const';
import MetadataScanner from 'scanners/metadata';
import * as messages from 'messages';
import { validMetadata } from '../helpers';


const filename = 'package.xpi';

describe('Add-on metadata', () => {
  it('should allow guids 255 characters or less in length', () => {
    var metadata = validMetadata({
      guid: 'a'.repeat(255),
    });
    var metadataScanner = new MetadataScanner(metadata, filename);

    return metadataScanner.scan()
      .then((validatorMessages) => {
        assert.equal(validatorMessages.length, 0);
      });
  });

  it('should not allow guids above 255 characters in length', () => {
    var metadata = validMetadata({
      guid: 'a'.repeat(256),
    });
    var metadataScanner = new MetadataScanner(metadata, filename);

    return metadataScanner.scan()
      .then((validatorMessages) => {
        assert.equal(validatorMessages.length, 1);
        assert.equal(validatorMessages[0].code,
                     messages.GUID_TOO_LONG.code);
        assert.equal(validatorMessages[0].type, VALIDATION_ERROR);
      });
  });
});
