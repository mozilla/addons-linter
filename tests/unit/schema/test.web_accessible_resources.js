import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';

describe('/web_accessible_resources', () => {
  describe('manifest_version 2', () => {
    it('should be an array', () => {
      const manifest = cloneDeep(validManifest);
      manifest.web_accessible_resources = 'foo.png';
      validateAddon(manifest);
      expect(validateAddon.errors.length).toEqual(1);
      expect(validateAddon.errors[0].instancePath).toEqual(
        '/web_accessible_resources'
      );
      expect(validateAddon.errors[0].message).toEqual('must be array');
    });

    it('should fail if not an array of strings', () => {
      const manifest = cloneDeep(validManifest);
      manifest.web_accessible_resources = ['foo.png', 1];
      validateAddon(manifest);
      expect(validateAddon.errors.length).toEqual(1);
      expect(validateAddon.errors[0].instancePath).toEqual(
        '/web_accessible_resources/1'
      );
      expect(validateAddon.errors[0].message).toEqual('must be string');
    });

    it('should be array of strings', () => {
      const manifest = cloneDeep(validManifest);
      manifest.web_accessible_resources = ['foo.png', 'bar.css'];
      validateAddon(manifest);
      expect(validateAddon.errors).toBeNull();
    });
  });

  describe('manifest_version 3', () => {
    it('should be array of objects with the expected format', () => {
      const manifest = {
        ...cloneDeep(validManifest),
        manifest_version: 3,
        web_accessible_resources: [
          {
            resources: ['foo.png', 'bar.css'],
            matches: ['*://*/*'],
          },
        ],
      };
      validateAddon(manifest, { maxManifestVersion: 3 });
      expect(validateAddon.errors).toBeNull();
    });

    it('should have validation error if not an array of objects', () => {
      const manifest = {
        ...cloneDeep(validManifest),
        manifest_version: 3,
        web_accessible_resources: ['foo.png'],
      };
      validateAddon(manifest, { maxManifestVersion: 3 });
      expect(validateAddon.errors.length).toBeGreaterThan(0);
      expect(validateAddon.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/web_accessible_resources/0',
            message: expect.stringMatching('must be object'),
          }),
        ])
      );
    });

    it('should have validation error if "resources" is not an array', () => {
      const manifest = {
        ...cloneDeep(validManifest),
        manifest_version: 3,
        web_accessible_resources: [
          {
            resources: 'foo.png',
            matches: ['*://*/*'],
          },
        ],
      };
      validateAddon(manifest, { maxManifestVersion: 3 });
      expect(validateAddon.errors.length).toBeGreaterThan(0);
      expect(validateAddon.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            instancePath: '/web_accessible_resources/0/resources',
            message: expect.stringMatching('must be array'),
          }),
        ])
      );
    });
  });
});
