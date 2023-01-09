import cloneDeep from 'lodash.clonedeep';

import { validateAddon } from 'schema/validator';

import { validManifest } from './helpers';

describe('declarative_net_request', () => {
  it('should not report errors on valid rule_resources', () => {
    const manifest = cloneDeep({
      ...validManifest,
      manifest_version: 3,
      declarative_net_request: {
        rule_resources: [
          {
            id: 'test-ruleset-id',
            enabled: true,
            path: 'ruleset-test.json',
          },
        ],
      },
    });
    validateAddon(manifest, {
      maxManifestVersion: 3,
    });
    expect(validateAddon.errors).toEqual(null);
  });

  it('should not report errors on unknown properties', () => {
    const manifest = cloneDeep({
      ...validManifest,
      manifest_version: 3,
      declarative_net_request: {
        unknown_property_dnr: {
          some_other_prop: 'unknown value dnr',
        },
        rule_resources: [
          {
            id: 'test-ruleset-id',
            enabled: true,
            path: 'ruleset-test.json',
            unknown_property: 'unknown value rule_resources',
          },
        ],
      },
    });
    validateAddon(manifest, {
      maxManifestVersion: 3,
    });
    expect(validateAddon.errors).toEqual(null);
  });

  it('should report error on invalid rule_resources id', () => {
    const manifest = cloneDeep({
      ...validManifest,
      manifest_version: 3,
      declarative_net_request: {
        rule_resources: [
          {
            id: '_invalid_id',
            enabled: true,
            path: 'ruleset-test.json',
          },
        ],
      },
    });
    validateAddon(manifest, {
      maxManifestVersion: 3,
    });
    expect(validateAddon.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/declarative_net_request/rule_resources/0/id',
          message: expect.stringMatching(/must match pattern/),
        }),
      ])
    );
  });

  it('should report error on missing required rule_resources enabled', () => {
    const manifest = cloneDeep({
      ...validManifest,
      manifest_version: 3,
      declarative_net_request: {
        rule_resources: [
          {
            id: 'test-missing-enabled',
            path: 'ruleset-test.json',
          },
        ],
      },
    });
    validateAddon(manifest, {
      maxManifestVersion: 3,
    });
    expect(validateAddon.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/declarative_net_request/rule_resources/0',
          message: expect.stringMatching(
            /must have required property 'enabled'/
          ),
        }),
      ])
    );
  });

  it('should report error on missing required rule_resources path', () => {
    const manifest = cloneDeep({
      ...validManifest,
      manifest_version: 3,
      declarative_net_request: {
        rule_resources: [
          {
            id: 'test-missing-enabled',
            enabled: true,
          },
        ],
      },
    });
    validateAddon(manifest, {
      maxManifestVersion: 3,
    });
    expect(validateAddon.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/declarative_net_request/rule_resources/0',
          message: expect.stringMatching(/must have required property 'path'/),
        }),
      ])
    );
  });

  it('should report error on non relate url string set on rule_resources path', () => {
    const manifest = cloneDeep({
      ...validManifest,
      manifest_version: 3,
      declarative_net_request: {
        rule_resources: [
          {
            id: 'test-missing-enabled',
            enabled: true,
            path: 'https://test/path',
          },
        ],
      },
    });
    validateAddon(manifest, {
      maxManifestVersion: 3,
    });
    expect(validateAddon.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          instancePath: '/declarative_net_request/rule_resources/0/path',
          message: expect.stringMatching(
            /must match format "strictRelativeUrl"/
          ),
        }),
      ])
    );
  });
});
