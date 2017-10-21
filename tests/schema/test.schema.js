import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';


describe('Schema JSON', () => {
  it('should be valid against the reference schema', () => {
    const isValid = validateAddon(validManifest);
    expect(isValid).toBeTruthy();
  });
});
