import MetadataScanner from 'scanners/metadata';
import * as rules from 'rules/metadata';
import { getRuleFiles, validMetadata } from '../helpers';
import { ignorePrivateFunctions } from 'utils';


describe('MetadataScanner', () => {

  it('should export and run all rules in rules/metadata', () => {
    var ruleFiles = getRuleFiles('metadata');
    var metadata = validMetadata();
    var scanner = new MetadataScanner(metadata, 'fake.xpi');

    assert.equal(ruleFiles.length,
                 Object.keys(ignorePrivateFunctions(rules)).length);

    return scanner.scan()
      .then(() => {
        assert.equal(scanner._rulesProcessed,
                     Object.keys(ignorePrivateFunctions(rules)).length);
      });
  });

});
