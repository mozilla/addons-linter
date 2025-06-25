/* eslint jest/no-conditional-expect: 0 */
import fs from 'fs';

import { oneLine } from 'common-tags';
import bcd from '@mdn/browser-compat-data';

import Linter from 'linter';
import ManifestJSONParser from 'parsers/manifestjson';
import { MANIFEST_VERSION_DEFAULT, PACKAGE_EXTENSION } from 'const';
import * as messages from 'messages';
import { firstStableVersion } from 'utils';
import { getDefaultConfigValue } from 'yargs-options';

import {
  assertHasMatchingError,
  assertHasMatchingErrorCount,
  validManifestJSON,
  validDictionaryManifestJSON,
  validLangpackManifestJSON,
  validStaticThemeManifestJSON,
  getStreamableIO,
  EMPTY_PNG,
  EMPTY_APNG,
  EMPTY_GIF,
  EMPTY_JPG,
  EMPTY_SVG,
  EMPTY_TIFF,
  EMPTY_WEBP,
} from '../helpers';

describe('ManifestJSONParser', () => {
  it('should have empty metadata if bad JSON', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const manifestJSONParser = new ManifestJSONParser(
      'blah',
      addonLinter.collector
    );
    expect(manifestJSONParser.isValid).toEqual(false);
    const { errors } = addonLinter.collector;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual(messages.JSON_INVALID.code);
    expect(errors[0].message).toContain('Your JSON is not valid.');

    const metadata = manifestJSONParser.getMetadata();
    expect(metadata.manifestVersion).toEqual(null);
    expect(metadata.name).toEqual(null);
    expect(metadata.version).toEqual(null);
    expect(metadata.experimentApiPaths).toBeInstanceOf(Set);
    expect(metadata.experimentApiPaths.size).toEqual(0);
  });

  it('should see browser_specific_settings as alias of applications', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const json = validManifestJSON({
      applications: undefined,
      browser_specific_settings: {
        gecko: {
          id: 'foo@baa',
          update_url: '',
        },
      },
    });
    const manifestJSONParser = new ManifestJSONParser(
      json,
      addonLinter.collector
    );
    const metadata = manifestJSONParser.getMetadata();
    expect(metadata.id).toEqual('foo@baa');

    // Verify that any lint error added from the schema
    // validation is not produced twice.
    expect(manifestJSONParser.isValid).toEqual(false);
    expect(addonLinter.collector.errors.length).toEqual(1);
    assertHasMatchingError(addonLinter.collector.errors, {
      code: messages.JSON_INVALID.code,
      message: /update_url" must match format "secureUrl"/,
      instancePath: '/browser_specific_settings/gecko/update_url',
    });
  });

  it('should warn if both "applications" and "browser_specific_settings" properties are being used', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const json = validManifestJSON({
      applications: {
        gecko: {
          strict_max_version: '58.0',
        },
      },
      browser_specific_settings: {
        gecko: {
          strict_max_version: '58.0',
        },
      },
    });
    const manifestJSONParser = new ManifestJSONParser(
      json,
      addonLinter.collector
    );
    expect(manifestJSONParser.isValid).toEqual(true);
    const { warnings } = addonLinter.collector;
    expect(warnings.length).toEqual(1);
    expect(warnings[0].code).toEqual('IGNORED_APPLICATIONS_PROPERTY');
  });

  it.each([
    {
      title: 'hidden and browser_action',
      manifest: {
        hidden: true,
        browser_action: {},
      },
      privileged: true,
      expectError: true,
    },
    {
      title: 'hidden and action',
      manifest: {
        manifest_version: 3,
        hidden: true,
        action: {},
      },
      privileged: true,
      expectError: true,
    },
    {
      title: 'hidden and page_action',
      manifest: {
        hidden: true,
        page_action: {},
      },
      privileged: true,
      expectError: true,
    },
    {
      title: 'hidden, browser_action and page_action',
      manifest: {
        hidden: true,
        page_action: {},
        browser_action: {},
      },
      privileged: true,
      expectError: true,
    },
    {
      title: 'hidden, action and page_action',
      manifest: {
        manifest_version: 3,
        hidden: true,
        action: {},
        page_action: {},
      },
      privileged: true,
      expectError: true,
    },
    {
      title: 'hidden and browser_action but not privileged',
      manifest: {
        hidden: true,
        browser_action: {},
      },
      privileged: false,
      expectError: false,
    },
    {
      title: 'hidden and page_action but not privileged',
      manifest: {
        hidden: true,
        page_action: {},
      },
      privileged: false,
      expectError: false,
    },
    {
      title: 'hidden but no action',
      manifest: {
        hidden: true,
      },
      privileged: true,
      expectError: false,
    },
    {
      title: 'browser action but no hidden prop',
      manifest: {
        browser_action: {},
      },
      privileged: true,
      expectError: false,
    },
    {
      title: 'browser action but not hidden',
      manifest: {
        hidden: false,
        browser_action: {},
      },
      privileged: true,
      expectError: false,
    },
    {
      title: 'page action but not hidden',
      manifest: {
        hidden: false,
        page_action: {},
      },
      privileged: true,
      expectError: false,
    },
  ])(
    'should report an error when hidden and actions are defined - $title',
    ({ manifest, privileged, expectError }) => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON(manifest);
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { schemaValidatorOptions: { privileged, maxManifestVersion: 3 } }
      );

      expect(manifestJSONParser.isValid).toEqual(!expectError);

      if (expectError) {
        expect(manifestJSONParser.isValid).toEqual(false);
        expect(addonLinter.collector.errors[0]).toMatchObject(
          expect.objectContaining({
            code: 'HIDDEN_NO_ACTION',
          })
        );
      } else {
        expect(addonLinter.collector.errors).toEqual([]);
      }
    }
  );

  it('should reject applications.gecko_android', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const json = validManifestJSON({
      applications: {
        gecko_android: {},
      },
    });

    const manifestJSONParser = new ManifestJSONParser(
      json,
      addonLinter.collector
    );

    const { errors } = addonLinter.collector;
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'MANIFEST_FIELD_UNSUPPORTED',
          message: `"/applications/gecko_android" is not supported.`,
          file: 'manifest.json',
        }),
      ])
    );
    expect(errors).toEqual([errors[0]]);
    expect(manifestJSONParser.isValid).toEqual(false);
  });

  it('should accept browser_specific_settings.gecko_android', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const json = validManifestJSON({
      browser_specific_settings: {
        gecko_android: {},
      },
    });

    const manifestJSONParser = new ManifestJSONParser(
      json,
      addonLinter.collector
    );

    const { errors, warnings } = addonLinter.collector;
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
    expect(manifestJSONParser.isValid).toEqual(true);
  });

  it('should accept applications.gecko AND browser_specific_settings.gecko_android', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const json = validManifestJSON({
      applications: {
        gecko: {
          strict_max_version: '100.0',
        },
      },
      browser_specific_settings: {
        gecko_android: {},
      },
    });

    const manifestJSONParser = new ManifestJSONParser(
      json,
      addonLinter.collector
    );

    const { notices } = addonLinter.collector;
    // This is only available if `applications.gecko` isn't lost when we deal
    // with both `applications` and `browser_specific_settings`.
    expect(notices).toEqual([
      expect.objectContaining({
        code: messages.STRICT_MAX_VERSION.code,
        message: expect.stringMatching('strict_max_version'),
      }),
    ]);
    expect(manifestJSONParser.isValid).toEqual(true);
  });

  it('should warn when gecko.strict_min_version is set below 113.0 and gecko_android is present', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const json = validManifestJSON({
      browser_specific_settings: {
        gecko: {
          strict_min_version: '100.0',
        },
        gecko_android: {},
      },
    });

    const manifestJSONParser = new ManifestJSONParser(
      json,
      addonLinter.collector
    );

    const { warnings } = addonLinter.collector;
    expect(warnings).toEqual([
      expect.objectContaining({
        code: messages.KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION,
        description: oneLine`"strict_min_version" requires Firefox for
            Android 100, which was released before version 113 introduced
            support for "browser_specific_settings.gecko_android".`,
      }),
    ]);
    expect(manifestJSONParser.isValid).toEqual(true);
  });

  it('should warn when gecko_android.strict_min_version is set below 113.0', () => {
    const addonLinter = new Linter({ _: ['bar'] });
    const json = validManifestJSON({
      browser_specific_settings: {
        gecko: {
          strict_min_version: '113.0',
        },
        gecko_android: {
          strict_min_version: '100.0',
        },
      },
    });

    const manifestJSONParser = new ManifestJSONParser(
      json,
      addonLinter.collector
    );

    const { warnings } = addonLinter.collector;
    expect(warnings).toEqual([
      expect.objectContaining({
        code: messages.KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION,
        description: oneLine`"strict_min_version" requires Firefox for
            Android 100, which was released before version 113 introduced
            support for "browser_specific_settings.gecko_android".`,
      }),
    ]);
    expect(manifestJSONParser.isValid).toEqual(true);
  });

  describe('browser_style', () => {
    function parseManifest(manifestVersion, manifestKey, browserStyleValue) {
      const manifest = {
        manifest_version: manifestVersion,
        [manifestKey]: {},
        browser_specific_settings: {
          gecko: {
            id: '@browser-style-test',
            // Avoid KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION warning;
            // "action" key has highest version requirement (109+).
            strict_min_version: '109.0',
          },
        },
      };
      if (browserStyleValue !== undefined) {
        manifest[manifestKey].browser_style = browserStyleValue;
      }
      // Add mandatory fields so that validation doesn't fail due to that.
      if (manifestKey === 'options_ui') {
        manifest.options_ui.page = 'options.html';
      } else if (manifestKey === 'sidebar_action') {
        manifest.sidebar_action.default_panel = 'sidebar.html';
      }
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON(manifest);
      return new ManifestJSONParser(json, addonLinter.collector);
    }
    it.each(['action', 'options_ui', 'page_action', 'sidebar_action'])(
      'should warn about MV3, unsupported %s.browser_style:true',
      (manifestKey) => {
        const manifestJSONParser = parseManifest(3, manifestKey, true);
        expect(manifestJSONParser.collector.errors).toEqual([]);
        expect(manifestJSONParser.collector.warnings).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'MANIFEST_FIELD_UNSUPPORTED',
              instancePath: `/${manifestKey}/browser_style`,
              message: expect.stringMatching(
                /browser_style" is not supported in manifest versions > 2/
              ),
            }),
          ])
        );
        expect(manifestJSONParser.isValid).toEqual(true);
      }
    );

    it.each(['action', 'options_ui', 'page_action', 'sidebar_action'])(
      'should not warn about MV3, despite %s.browser_style:false',
      (manifestKey) => {
        const manifestJSONParser = parseManifest(3, manifestKey, false);
        expect(manifestJSONParser.collector.errors).toEqual([]);
        expect(manifestJSONParser.collector.warnings).toEqual([]);
        expect(manifestJSONParser.isValid).toEqual(true);
      }
    );

    it.each(['action', 'options_ui', 'page_action', 'sidebar_action'])(
      'should not warn about MV3 without %s.browser_style',
      (manifestKey) => {
        const manifestJSONParser = parseManifest(3, manifestKey, undefined);
        expect(manifestJSONParser.collector.errors).toEqual([]);
        expect(manifestJSONParser.collector.warnings).toEqual([]);
        expect(manifestJSONParser.isValid).toEqual(true);
      }
    );

    it.each(['browser_action', 'options_ui', 'page_action', 'sidebar_action'])(
      'should not warn about MV2, %s.browser_style:true',
      (manifestKey) => {
        const manifestJSONParser = parseManifest(2, manifestKey, true);
        expect(manifestJSONParser.collector.errors).toEqual([]);
        expect(manifestJSONParser.collector.warnings).toEqual([]);
        expect(manifestJSONParser.isValid).toEqual(true);
      }
    );
  });

  describe('id', () => {
    it('should return the correct id', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.id).toEqual('{daf44bf7-a45e-4450-979c-91cf07434c3d}');
    });

    it('should fail on invalid id', () => {
      // This is probably covered in other tests, but verifies that if the
      // id is something incorrect, you shouldn't even be calling getMetadata.
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_specific_settings: { gecko: { id: 'wat' } },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message: /"\/browser_specific_settings\/gecko\/id" must match pattern/,
      });
    });

    it('should fail on id containing unicode chars', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_specific_settings: { gecko: { id: '@fôobar' } },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message: /"\/browser_specific_settings\/gecko\/id" must match pattern/,
      });
    });

    it('should fail on id longer than 80 characters', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        // ids containing non-ascii chars are forbidden per the schema
        // definition so we only need to test ascii here.
        browser_specific_settings: { gecko: { id: `@${'a'.repeat(80)}` } }, // 81 chars
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message:
          /"\/browser_specific_settings\/gecko\/id" must NOT have more than 80 characters/,
      });
    });

    it('should return null if undefined', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ browser_specific_settings: {} });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.id).toEqual(null);
    });

    it('is optional in MV2', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        manifest_version: 2,
        browser_specific_settings: { gecko: {} },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('should be mandatory in MV3', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        manifest_version: 3,
        browser_specific_settings: { gecko: {} },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(
        addonLinter.collector.errors,
        messages.EXTENSION_ID_REQUIRED
      );
    });
  });

  describe('manifestVersion', () => {
    it('should collect an error on invalid manifest_version value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ manifest_version: 'whatever' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors.length).toEqual(1);
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/manifest_version');
    });

    it('should collect an error with numeric string value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ manifest_version: '1' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/manifest_version');
    });

    it('should have the right manifestVersion', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      // Make sure it does match the version from the manifest json file.
      expect(metadata.manifestVersion).toEqual(
        JSON.parse(json).manifest_version
      );
      // Make sure it is >= than the default manifest version.
      expect(metadata.manifestVersion).toBeGreaterThanOrEqual(
        MANIFEST_VERSION_DEFAULT
      );
      // Make sure it is >= than the default min manifest version.
      expect(metadata.manifestVersion).toBeGreaterThanOrEqual(
        getDefaultConfigValue('min-manifest-version')
      );
      // Make sure it is <= than the default max manifest version.
      expect(metadata.manifestVersion).toBeLessThanOrEqual(
        getDefaultConfigValue('max-manifest-version')
      );
    });
  });

  describe('host permissions', () => {
    it('allows host permissions in permissions manifest key in MV2', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        manifest_version: 2,
        permissions: ['*://example.org/*', '<all_urls>'],
      });

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.collector.errors).toEqual([]);
    });

    it('warns on host permissions in permissions manifest key in MV3', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        manifest_version: 3,
        permissions: ['*://example.org/*'],
      });

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { schemaValidatorOptions: { maxManifestVersion: 3 } }
      );
      expect(manifestJSONParser.collector.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'MANIFEST_PERMISSIONS',
            instancePath: '/permissions/0',
            message: expect.stringMatching(
              /Invalid permissions "\*:\/\/example\.org\/\*" at 0/
            ),
          }),
        ])
      );
      expect(manifestJSONParser.collector.errors).toEqual([]);
    });

    it('ignores invalid host_permissions manifest key values in MV2', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        manifest_version: 2,
        host_permissions: ['foo'],
      });

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.collector.errors).toEqual([]);
      expect(manifestJSONParser.collector.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'MANIFEST_FIELD_UNSUPPORTED',
            instancePath: '/host_permissions',
            message: expect.stringMatching(
              /not supported in manifest versions < 3/
            ),
          }),
        ])
      );
    });

    it('allows host_permissions manifest key in MV3', () => {
      // Test with only valid host permissions.
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        manifest_version: 3,
        host_permissions: ['*://example.org/*'],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { schemaValidatorOptions: { maxManifestVersion: 3 } }
      );
      expect(manifestJSONParser.collector.errors).toEqual([]);
    });

    it('warns on invalid host_permissions in MV3', () => {
      // Test with only valid host permissions.
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        manifest_version: 3,
        host_permissions: ['foo'],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { schemaValidatorOptions: { maxManifestVersion: 3 } }
      );
      expect(manifestJSONParser.collector.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'MANIFEST_HOST_PERMISSIONS',
            instancePath: '/host_permissions/0',
            message: expect.stringMatching(
              /Invalid host_permissions "foo" at 0/
            ),
          }),
        ])
      );
      expect(manifestJSONParser.collector.errors).toEqual([]);
    });

    it('warns on <all_urls> in MV3 permissions', () => {
      // Test with invalid permission and host permissions.
      const addonLinter = new Linter({ _: ['bar'] });
      const json_with_warnings = validManifestJSON({
        manifest_version: 3,
        permissions: ['<all_urls>'],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json_with_warnings,
        addonLinter.collector,
        { schemaValidatorOptions: { maxManifestVersion: 3 } }
      );
      expect(manifestJSONParser.collector.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'MANIFEST_PERMISSIONS',
            instancePath: '/permissions/0',
            message: expect.stringMatching(
              /Invalid permissions "<all_urls>" at 0/
            ),
          }),
        ])
      );
      expect(manifestJSONParser.collector.errors).toEqual([]);
    });

    it('should not add a warning on valid host permission if a permission is invalid', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        permissions: ['SOME_INVALID_PERMISSION', 'http://example.com/*'],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        {
          schemaValidatorOptions: {
            minManifestVersion: 2,
            maxManifestVersion: 3,
          },
        }
      );
      expect(addonLinter.collector.errors).toEqual([]);
      expect(addonLinter.collector.notices).toEqual([]);
      // SOME_INVALID_PERMISSION should be reported as invalid.
      expect(addonLinter.collector.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'MANIFEST_PERMISSIONS',
            instancePath: '/permissions/0',
          }),
        ])
      );
      // http://example.com/* should NOT be reported as invalid.
      expect(addonLinter.collector.warnings).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({
            code: 'MANIFEST_PERMISSIONS',
            instancePath: '/permissions/1',
          }),
        ])
      );
      expect(manifestJSONParser.isValid).toEqual(false);

      // Confirm that the unexpected origin is reported as a validation
      // error if the extension is a manifest version 3 extension.
      const jsonv3 = validManifestJSON({
        manifest_version: 3,
        browser_specific_settings: {
          gecko: {
            id: 'test@extension',
            strict_min_version: '56.0',
          },
        },
        permissions: ['SOME_INVALID_PERMISSION', 'http://example.com/*'],
      });

      const manifestJSONParserV3 = new ManifestJSONParser(
        jsonv3,
        addonLinter.collector,
        {
          schemaValidatorOptions: {
            minManifestVersion: 2,
            maxManifestVersion: 3,
          },
        }
      );
      expect(addonLinter.collector.errors).toEqual([]);
      expect(addonLinter.collector.notices).toEqual([]);
      // SOME_INVALID_PERMISSION should still be reported as invalid.
      expect(addonLinter.collector.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'MANIFEST_PERMISSIONS',
            instancePath: '/permissions/0',
          }),
        ])
      );
      // http://example.com/* should also be reported as invalid.
      expect(addonLinter.collector.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'MANIFEST_PERMISSIONS',
            instancePath: '/permissions/1',
          }),
        ])
      );
      expect(manifestJSONParserV3.isValid).toEqual(false);
    });
  });

  describe('bad permissions', () => {
    for (const manifestKey of ['permissions', 'optional_permissions']) {
      it(`should not error if a value in ${manifestKey} is a string (even if unknown)`, () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const expectedMsgCode =
          manifestKey === 'permissions'
            ? messages.MANIFEST_PERMISSIONS.code
            : messages.MANIFEST_OPTIONAL_PERMISSIONS.code;

        const json = validManifestJSON({
          [manifestKey]: ['idle', 'fileSystem'],
          browser_specific_settings: { gecko: { strict_min_version: '55.0' } },
        });
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );
        expect(manifestJSONParser.isValid).toEqual(false);
        const { warnings } = addonLinter.collector;
        expect(addonLinter.collector.errors.length).toBe(0);
        assertHasMatchingError(warnings, {
          code: expectedMsgCode,
          message: new RegExp(`Invalid ${manifestKey} "fileSystem"`),
        });
      });

      it(`should error if a value in ${manifestKey} is not a string`, () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const expectedMsgCode =
          manifestKey === 'permissions'
            ? messages.MANIFEST_BAD_PERMISSION.code
            : messages.MANIFEST_BAD_OPTIONAL_PERMISSION.code;
        const json = validManifestJSON({
          [manifestKey]: [
            'idle',
            {
              fileSystem: ['write'],
            },
          ],
          browser_specific_settings: { gecko: { strict_min_version: '55.0' } },
        });

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );
        expect(manifestJSONParser.isValid).toEqual(false);
        const { errors } = addonLinter.collector;
        expect(errors[0].code).toEqual(expectedMsgCode);
        expect(errors[0].message).toContain('must be string');
      });

      it(`should error if values in ${manifestKey} are duplicated`, () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const expectedMsgCode =
          manifestKey === 'permissions'
            ? messages.MANIFEST_BAD_PERMISSION.code
            : messages.MANIFEST_BAD_OPTIONAL_PERMISSION.code;
        const json = validManifestJSON({
          [manifestKey]: ['idle', 'idle'],
          browser_specific_settings: { gecko: { strict_min_version: '55.0' } },
        });

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );
        expect(manifestJSONParser.isValid).toEqual(false);
        const { errors } = addonLinter.collector;
        expect(errors[0].code).toEqual(expectedMsgCode);
        expect(errors[0].message).toContain('must NOT have duplicate items');
      });

      it(`should error if ${manifestKey} is not an array`, () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          [manifestKey]: 'not-an-array',
        });

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );

        expect(manifestJSONParser.isValid).toEqual(false);
        const { errors } = addonLinter.collector;
        expect(errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ code: 'MANIFEST_FIELD_INVALID' }),
          ])
        );
      });
    }
  });

  describe('privileged add-ons', () => {
    it('should not report privileged permissions and properties as issues', () => {
      const expectedPermissions = ['mozillaAddons', 'telemetry'];
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        permissions: ['tabs', ...expectedPermissions],
        l10n_resources: [],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        {
          schemaValidatorOptions: {
            privileged: true,
          },
        }
      );
      expect(addonLinter.collector.warnings).toEqual([]);
      expect(addonLinter.collector.errors).toEqual([]);
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    // Verify that if no privileged permissions are required or mozillaAddons mandatory permission
    // isn't required the privileged add-on isn't considered valid (because the linter is expected
    // to prevent signing of privileged extensions until these conditions are met).
    it.each([
      [
        'with no privileged permissions',
        ['tabs'],
        {
          code: 'PRIVILEGED_FEATURES_REQUIRED',
          message: expect.stringMatching(
            /\/permissions: Privileged extensions should declare privileged permissions/
          ),
          description: oneLine`
            This extension does not declare any privileged permission. It does not need to be signed with the privileged certificate.
            Please upload it directly to https://addons.mozilla.org/.
          `,
        },
      ],
      [
        'without the mandatory mozillaAddons permission',
        ['tabs', 'telemetry'],
        {
          code: 'MOZILLA_ADDONS_PERMISSION_REQUIRED',
          message: expect.stringMatching(
            /\/permissions: The "mozillaAddons" permission is required for privileged extensions/
          ),
        },
      ],
    ])(
      'should report an error %s',
      (description, permissions, expectedError) => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          permissions,
        });
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          {
            schemaValidatorOptions: {
              privileged: true,
            },
          }
        );
        expect(addonLinter.collector.warnings).toEqual([]);
        expect(addonLinter.collector.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ...expectedError,
              file: 'manifest.json',
              instancePath: '/permissions',
            }),
          ])
        );
        expect(manifestJSONParser.isValid).toEqual(false);
      }
    );

    // Verify that an extension requiring a privileged manifest field (e.g. l10n_resources or extension_apis)
    // isn't considered valid if it does not also require the "mozillaAddons" permission (because the linter is
    // expected to prevent signing of privileged extensions until these conditions are met).
    it.each([
      [
        'l10n_resources',
        [],
        {
          code: 'MOZILLA_ADDONS_PERMISSION_REQUIRED',
          message: expect.stringMatching(
            /\/l10n_resources: The "mozillaAddons" permission is required for extensions that include privileged manifest fields\./
          ),
          instancePath: '/l10n_resources',
        },
      ],
      [
        'experiment_apis',
        {},
        {
          code: 'MOZILLA_ADDONS_PERMISSION_REQUIRED',
          message: expect.stringMatching(
            /\/experiment_apis: The "mozillaAddons" permission is required for extensions that include privileged manifest fields\./
          ),
          instancePath: '/experiment_apis',
        },
      ],
    ])(
      'should report an error on "%s" privileged manifest field and no "mozillaAddons" permission',
      (fieldName, fieldValue, expectedError) => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          permissions: [],
          [fieldName]: fieldValue,
        });
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          {
            schemaValidatorOptions: {
              privileged: true,
            },
          }
        );
        expect(addonLinter.collector.warnings).toEqual([]);
        expect(addonLinter.collector.errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              ...expectedError,
              file: 'manifest.json',
            }),
          ])
        );
        expect(manifestJSONParser.isValid).toEqual(false);
      }
    );
  });

  describe('privileged property', () => {
    // This test confirms that if an extension that should be signed as privileged
    // is submitted to AMO it would be blocked on the linting checks and not
    // wrongly signed with a non-privileged signature.
    it.each([
      ['errors', { isAlreadySigned: false }],
      ['warnings', { isAlreadySigned: true }],
    ])(
      `should report %s on privileged properties if %p`,
      (severity, { isAlreadySigned }) => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          l10n_resources: [],
        });
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { isAlreadySigned }
        );
        expect(manifestJSONParser.collector[severity]).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'MANIFEST_FIELD_PRIVILEGED',
              file: 'manifest.json',
              message: expect.stringMatching(
                /\/l10n_resources: privileged manifest fields .* allowed in privileged extensions/
              ),
            }),
          ])
        );
        expect(
          manifestJSONParser.collector[
            severity === 'errors' ? 'warnings' : 'errors'
          ]
        ).toEqual([]);
      }
    );
  });

  describe('privileged permissions', () => {
    // This test confirms that if an extension that should be signed as privileged
    // is submitted to AMO it would be blocked on the linting checks and not
    // wrongly signed with a non-privileged signature.
    it.each([
      ['errors', { isAlreadySigned: false }],
      ['warnings', { isAlreadySigned: true }],
    ])(
      `should report %s on privileged permissions if %p`,
      (severity, { isAlreadySigned }) => {
        const expectedPermissions = ['mozillaAddons', 'telemetry'];
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          permissions: ['tabs', ...expectedPermissions],
        });
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { isAlreadySigned }
        );
        expect(manifestJSONParser.collector[severity]).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'MANIFEST_PERMISSIONS_PRIVILEGED',
              file: 'manifest.json',
              message: expect.stringMatching(
                new RegExp(
                  `/permissions: the following privileged permissions .* ${JSON.stringify(
                    expectedPermissions
                  )}`
                )
              ),
            }),
          ])
        );
        expect(
          manifestJSONParser.collector[
            severity === 'errors' ? 'warnings' : 'errors'
          ]
        ).toEqual([]);
      }
    );
  });

  describe('granted_host_permissions', () => {
    it('warns on granted_permissions manifest key set to true', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        manifest_version: 2,
        granted_host_permissions: true,
      });

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.collector.errors).toEqual([]);
      expect(manifestJSONParser.collector.warnings).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'MANIFEST_FIELD_PRIVILEGEDONLY',
            message: expect.stringMatching(
              /"granted_host_permissions" is ignored for non-privileged add-ons/
            ),
          }),
        ])
      );
    });

    it('does not warn on granted_permissions manifest key set to false', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        manifest_version: 2,
        granted_host_permissions: false,
      });

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.collector.errors).toEqual([]);
      expect(manifestJSONParser.collector.warnings).toEqual([]);
    });
  });

  describe('type', () => {
    it('should have the right type', () => {
      // Type is always returned as PACKAGE_EXTENSION presently.
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.type).toEqual(PACKAGE_EXTENSION);
    });

    it('should not allow the type to be user-specified', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ type: 'whatevs' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.type).toEqual(PACKAGE_EXTENSION);
    });
  });

  describe('ManifestJSONParser lookup', () => {
    const unknownDataPaths = ['', '/permissions/foo', '/permissions/'];
    unknownDataPaths.forEach((unknownData) => {
      it(`should return invalid for ${unknownData}`, () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const parser = new ManifestJSONParser(
          validManifestJSON(),
          addonLinter.collector
        );
        const message = parser.errorLookup({ instancePath: '' });
        expect(message.code).toEqual(messages.JSON_INVALID.code);
      });
    });

    it('should return required for missing', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const parser = new ManifestJSONParser(
        validManifestJSON(),
        addonLinter.collector
      );
      const message = parser.errorLookup({
        instancePath: '',
        keyword: 'required',
      });
      expect(message.code).toEqual(messages.MANIFEST_FIELD_REQUIRED.code);
    });

    it('should return invalid for wrong type', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const parser = new ManifestJSONParser(
        validManifestJSON(),
        addonLinter.collector
      );
      const message = parser.errorLookup({ instancePath: '', keyword: 'type' });
      expect(message.code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
    });

    for (const manifestKey of ['permissions', 'optional_permissions']) {
      const expectedMsgCode =
        manifestKey === 'permissions'
          ? messages.MANIFEST_PERMISSIONS.code
          : messages.MANIFEST_OPTIONAL_PERMISSIONS.code;

      it(`should return ${manifestKey} for wrong type`, () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const parser = new ManifestJSONParser(
          validManifestJSON(),
          addonLinter.collector
        );
        const message = parser.errorLookup({
          instancePath: `/${manifestKey}/0`,
        });
        expect(message.code).toEqual(expectedMsgCode);
      });
    }

    it('Lookup LWT alias with custom message overwrite', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const parser = new ManifestJSONParser(
        validManifestJSON(),
        addonLinter.collector
      );
      const message = parser.errorLookup({
        keyword: 'deprecated',
        instancePath: '/theme/images/headerURL',
        message: 'This is going to be ignored...',
      });
      expect(message.message).toEqual(
        'This theme LWT alias has been removed in Firefox 70.'
      );
    });

    describe('min/max_manifest_version', () => {
      for (const manifestKey of [
        'permissions',
        'optional_permissions',
        'another_manifest_field',
      ]) {
        it(`returns the expected error code for unsupported ${manifestKey}`, () => {
          const addonLinter = new Linter({ _: ['bar'] });
          const parser = new ManifestJSONParser(
            validManifestJSON(),
            addonLinter.collector
          );

          const isPermission = manifestKey.includes('permissions');
          const errorObject = parser.errorLookup({
            // Mimic the error reported by the min_manifest_version keyword
            // (as defined in src/schema/validator.js)
            keyword: 'min_manifest_version',
            params: { min_manifest_version: 3 },
            // The following are properties added by ajv to the ones
            // explicitly reported by the keyword validate function.
            data: isPermission ? 'perm-value' : 'unused-field-value',
            instancePath: manifestKey.includes('permissions')
              ? `/${manifestKey}/0`
              : `/${manifestKey}`,
          });

          const unsupportedRange = 'supported in manifest versions < 3';
          const message = isPermission
            ? `/${manifestKey}: "${'perm-value'}" is not ${unsupportedRange}.`
            : `"/${manifestKey}" is not ${unsupportedRange}.`;
          const code = isPermission
            ? messages.MANIFEST_PERMISSION_UNSUPPORTED
            : messages.MANIFEST_FIELD_UNSUPPORTED;

          expect(errorObject).toMatchObject({
            message,
            description: message,
            code,
          });
        });
      }

      it('warns on unsupported manifest key', () => {
        const linter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          action: { default_popup: 'popup.html' },
          browser_action: { default_popup: 'popup.html' },
        });
        const manifestJSONParser = new ManifestJSONParser(
          json,
          linter.collector,
          { io: { files: { 'popup.html': '' } } }
        );

        expect(manifestJSONParser.collector.warnings).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'MANIFEST_FIELD_UNSUPPORTED',
              // This would need to be changed to /browser_action
              // if the manifest_version we test by default becomes
              // manifest_version 3.
              instancePath: '/action',
            }),
          ])
        );
        expect(linter.collector.errors).toEqual([]);
      });
    });
  });

  describe('enum', () => {
    for (const mainfestKey of ['permissions', 'optional_permissions']) {
      const expectedMsg =
        mainfestKey === 'optional_permissions'
          ? messages.MANIFEST_OPTIONAL_PERMISSIONS
          : messages.MANIFEST_PERMISSIONS;
      it(`${mainfestKey} should only return one message`, () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          [mainfestKey]: ['idle', 'wat'],
          browser_specific_settings: { gecko: { strict_max_version: '55.0' } },
        });
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );
        expect(manifestJSONParser.isValid).toEqual(false);
        const { warnings } = addonLinter.collector;
        expect(warnings[0].code).toEqual(expectedMsg.code);
        expect(warnings[0].message).toContain(
          `/${mainfestKey}: Invalid ${mainfestKey} "wat" at 1.`
        );
        expect(warnings.length).toEqual(1);
      });
    }
  });

  describe('optional only permissions', () => {
    const OPTIONAL_ONLY_PERMISSIONS = ['userScripts', 'trialML'];

    it.each(OPTIONAL_ONLY_PERMISSIONS)(
      'should warn on optional-only permission "%s" requested as non-optional',
      (permName) => {
        const linter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          permissions: ['tabs', permName],
          browser_specific_settings: { gecko: { strict_max_version: '135.0' } },
        });
        const manifestJSONParser = new ManifestJSONParser(
          json,
          linter.collector
        );
        expect(manifestJSONParser.collector.warnings).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'MANIFEST_PERMISSIONS',
              instancePath: '/permissions/1',
              message: expect.stringMatching(
                new RegExp(`Invalid permissions "${permName}"`)
              ),
            }),
          ])
        );
        expect(linter.collector.errors).toEqual([]);
        expect(manifestJSONParser.isValid).toEqual(false);
      }
    );

    it.each(OPTIONAL_ONLY_PERMISSIONS)(
      'should allow permission "%s" in optional_permissions',
      (permName) => {
        const linter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          optional_permissions: ['tabs', permName],
          browser_specific_settings: { gecko: { strict_max_version: '135.0' } },
        });
        const manifestJSONParser = new ManifestJSONParser(
          json,
          linter.collector
        );
        expect(linter.collector.warnings).toEqual([]);
        expect(linter.collector.errors).toEqual([]);
        expect(manifestJSONParser.isValid).toEqual(true);
      }
    );
  });

  describe('name', () => {
    it('should extract a name', () => {
      // Type is always returned as PACKAGE_EXTENSION presently.
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ name: 'my-awesome-ext' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.name).toEqual('my-awesome-ext');
    });

    it('should collect an error on missing name value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ name: undefined });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_REQUIRED.code);
      expect(errors[0].message).toContain(
        `"/" must have required property 'name'`
      );
    });

    it.each([1, null])(
      'should collect an error on non-string name value: %s',
      (name) => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({ name });
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );

        const { errors } = addonLinter.collector;
        expect(errors).toEqual([
          expect.objectContaining({
            ...messages.MANIFEST_FIELD_INVALID,
            message: expect.stringMatching('/name'),
          }),
        ]);
        expect(manifestJSONParser.isValid).toEqual(false);
      }
    );

    it.each([
      ' '.repeat(2),
      ' '.repeat(3),
      ' a',
      ' a ',
      'a ',
      '   ', // two tabs
      `a${' '.repeat(44)}`,
      'a\v',
      'a\f',
      '\f\v',
      'a\u0020',
      'a\u00A0',
      'a\uFEFF',
      // See: https://util.unicode.org/UnicodeJsps/list-unicodeset.jsp?a=%5Cp%7BGeneral_Category%3DSpace_Separator%7D
      'a\u1680',
      'a\u2000',
      'a\u2001',
      'a\u2002',
      'a\u2003',
      'a\u2004',
      'a\u2005',
      'a\u2006',
      'a\u2007',
      'a\u2008',
      'a\u2009',
      'a\u200A',
      'a\u202F',
      'a\u205F',
      'a\u3000',
      // line terminators
      'a\r',
      'a\n',
      'a\u2028',
      'a\u2029',
    ])('should account for whitespaces: %s', (name) => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ name });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      const { errors } = addonLinter.collector;
      expect(errors).toEqual([
        expect.objectContaining(messages.PROP_NAME_INVALID),
      ]);
      expect(manifestJSONParser.isValid).toEqual(false);
    });
  });

  describe('version', () => {
    it('should extract a version', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ version: '1.0' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const metadata = manifestJSONParser.getMetadata();
      expect(metadata.version).toEqual('1.0');
    });

    it('should collect an error on missing version value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ version: undefined });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_REQUIRED.code);
      expect(errors[0].message).toContain(
        `"/" must have required property 'version'`
      );
    });

    it('should collect an error on non-string version value', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ version: 1 });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.MANIFEST_FIELD_INVALID.code);
      expect(errors[0].message).toContain('/version');
    });

    it.each([
      {
        title: 'MV2 - toolkit version',
        version: '1.0a',
        manifestVersion: 2,
        expectWarning: true,
        expectError: false,
      },
      {
        title: 'MV2 - non-toolkit version',
        version: '1.0',
        manifestVersion: 2,
        expectWarning: false,
        expectError: false,
      },
      {
        title: 'MV2 - large version number',
        version: '1.999999999',
        manifestVersion: 2,
        expectWarning: false,
        expectError: false,
      },
      {
        title: 'MV2 - leading zeros',
        version: '2022.01',
        manifestVersion: 2,
        expectWarning: false,
        expectError: true,
      },
      {
        title: 'MV3 - toolkit version',
        version: '1.0a',
        manifestVersion: 3,
        expectWarning: false,
        expectError: true,
      },
      {
        title: 'MV3 - non-toolkit version',
        version: '1.0',
        manifestVersion: 3,
        expectWarning: false,
        expectError: false,
      },
      {
        title: 'MV3 - large version number',
        version: '1.999999999',
        manifestVersion: 3,
        expectWarning: false,
        expectError: false,
      },
      {
        title: 'MV3 - leading zeros',
        version: '2022.01',
        manifestVersion: 3,
        expectWarning: false,
        expectError: true,
      },
    ])(
      `validates manifest version key: $title`,
      ({ title, version, manifestVersion, expectWarning, expectError }) => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          manifest_version: manifestVersion,
          version,
          name: title,
        });

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { schemaValidatorOptions: { maxManifestVersion: 3 } }
        );

        const { errors, warnings } = addonLinter.collector;

        if (expectError) {
          expect(errors).toEqual([
            expect.objectContaining({
              code: messages.VERSION_FORMAT_INVALID.code,
            }),
          ]);
          expect(warnings).toEqual([]);
        }

        if (expectWarning) {
          expect(warnings).toEqual([
            expect.objectContaining({
              code: messages.VERSION_FORMAT_DEPRECATED.code,
            }),
          ]);
          expect(errors).toEqual([]);
        }

        expect(manifestJSONParser.isValid).toEqual(!expectError);
      }
    );
  });

  describe('strict_max_version', () => {
    it.each(['gecko', 'gecko_android'])(
      'warns on %s.strict_max_version',
      (key) => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          browser_specific_settings: {
            [key]: {
              strict_max_version: '58.0',
            },
          },
        });

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );

        expect(manifestJSONParser.isValid).toEqual(true);
        const { notices } = addonLinter.collector;
        expect(notices).toEqual([
          expect.objectContaining({
            code: messages.STRICT_MAX_VERSION.code,
            message: expect.stringMatching('strict_max_version'),
          }),
        ]);
      }
    );

    it('does not warn on strict_max_version in language packs', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validLangpackManifestJSON({
        browser_specific_settings: {
          gecko: {
            strict_max_version: '58.0',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.notices.length).toEqual(0);
    });

    it('errors on strict_max_version in dictionaries', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({
        browser_specific_settings: {
          gecko: {
            id: '@my-dictionary',
            strict_max_version: '58.0',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: { files: { 'path/to/fr.dic': '', 'path/to/fr.aff': '' } } }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.STRICT_MAX_VERSION.code);
      expect(errors[0].message).toContain('strict_max_version');
    });
  });

  describe('strict_min_version', () => {
    it('should warn when using a manifest key before Firefox marks it as supported', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_specific_settings: {
          gecko: {
            strict_min_version: '47.0',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(6);
      let fxIncompatCount = 0;
      for (const warning of addonLinter.collector.warnings) {
        if (
          warning.code !==
          messages.KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION
        ) {
          expect(warning.code).toEqual(
            messages.KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION
          );
          ++fxIncompatCount;
        }
      }
      expect(fxIncompatCount).toBeGreaterThan(0);
    });

    it('should warn when using a manifest key before Firefox for Android marks it as supported', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_specific_settings: {
          gecko: {
            strict_min_version: '47.0',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(6);
      let fxaIncompatCount = 0;
      for (const warning of addonLinter.collector.warnings) {
        if (warning.code !== messages.KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION) {
          expect(warning.code).toEqual(
            messages.KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION
          );
          ++fxaIncompatCount;
        }
      }
      expect(fxaIncompatCount).toBeGreaterThan(0);
    });

    it('should not warn when using an unsupported manifest key without strict_min_version', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(0);
    });

    it('should not warn when all manifest keys are supported in Firefox and Firefox for Android with the given strict_min_version', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_specific_settings: {
          gecko: {
            strict_min_version: '48.0a1',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(0);
    });

    it('should ignore manifest key version support for dictionaries', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({
        // Avoid a warning about the version format since we verify the number
        // of warnings below.
        version: '1.0',
        browser_specific_settings: {
          gecko: {
            id: '@my-dictionary',
            strict_min_version: '47.0',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        {
          io: { files: { 'path/to/fr.dic': '', 'path/to/fr.aff': '' } },
        }
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(0);
    });

    it('should ignore manifest key version support for langpacks', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validLangpackManifestJSON({
        browser_specific_settings: {
          gecko: {
            strict_min_version: '47.0',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(0);
    });

    it('should warn on unsupported subkeys', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_specific_settings: {
          gecko: {
            strict_min_version: '54.0',
          },
        },
        chrome_settings_overrides: {
          homepage: 'https://example.com',
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      const { warnings } = addonLinter.collector;
      expect(warnings.length).toEqual(2);
      for (const warning of warnings) {
        expect(warning.code).toEqual(
          messages.KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION
        );
      }
    });

    it('should warn on unsupported subsubkeys', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_specific_settings: {
          gecko: {
            strict_min_version: '56.0',
          },
        },
        chrome_settings_overrides: {
          search_provider: {
            name: 'test',
            search_url: 'https://example.com',
            is_default: true,
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      const { warnings } = addonLinter.collector;
      expect(warnings.length).toEqual(1);
      expect(warnings[0].code).toEqual(
        messages.KEY_FIREFOX_UNSUPPORTED_BY_MIN_VERSION
      );
    });

    it('should add a notice on unsupported permissions', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_specific_settings: {
          gecko: {
            strict_min_version: '56.0',
          },
        },
        optional_permissions: ['find'],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(0);
      expect(addonLinter.collector.notices.length).toEqual(1);
      expect(addonLinter.collector.notices[0].code).toEqual(
        messages.PERMISSION_FIREFOX_UNSUPPORTED_BY_MIN_VERSION
      );
    });

    it('should add a notice on unsupported permissions on android', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_specific_settings: {
          gecko: {
            strict_min_version: '55.0',
          },
        },
        permissions: ['browsingData'],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toEqual(0);
      expect(addonLinter.collector.notices.length).toEqual(1);
      expect(addonLinter.collector.notices[0].code).toEqual(
        messages.PERMISSION_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION
      );
    });
  });

  describe('content security policy', () => {
    describe('should warn on invalid values according to Add-On Policies', () => {
      const invalidValues = [
        '', // Empty CSP does not clear the CSP, so it should warn.
        'foo', // invalid directive, equivalent to empty CSP

        'default-src *',
        'default-src moz-extension: *', // mixed with * invalid
        'default-src ws:',
        'default-src wss:',
        'default-src http:',
        'default-src https:',
        'default-src ftp:',
        'default-src http://cdn.example.com/my.js',
        'default-src https://cdn.example.com/my.js',
        'default-src web.example.com',
        'default-src web.example.com:80',
        'default-src web.example.com:443',

        'script-src *',
        'script-src moz-extension: *', // mixed with * invalid
        'script-src self', // should have been "'self'", not "self"
        'script-src ws:',
        'script-src wss:',
        'script-src http:',
        'script-src https:',
        'script-src ftp:',
        'script-src http://cdn.example.com/my.js',
        'script-src https://cdn.example.com/my.js',
        'script-src web.example.com',
        'script-src web.example.com:80',
        'script-src web.example.com:443',
        "script-src 'nonce-abc'",
        "script-src 'sha256-/b/HvSeUCyUL0XlV1ZK0nwDk18O2BpM5Scj+dZ1weIY='",

        // unsafe-inline is rejected by Firefox WebExtensions manifest validation
        // (AddonContentPolicy::ValidateAddonCSP will be reporting an error if it
        // is found in a custom CSP set from the Extension throuh the manifest.json
        // field, the custom CSP ignored and the default CSP will be used instead).
        "script-src 'self' 'unsafe-inline';",

        // Without a secure default-src or script-src, these don't count:
        "script-src-elem 'self'",
        "worker-src 'self'",

        'default-src; script-src-elem *',
        'default-src; script-src-elem moz-extension: *', // mixed with * invalid
        'default-src; script-src-elem ws:',
        'default-src; script-src-elem wss:',
        'default-src; script-src-elem http:',
        'default-src; script-src-elem https:',
        'default-src; script-src-elem ftp:',
        'default-src; script-src-elem http://cdn.example.com/my.js',
        'default-src; script-src-elem https://cdn.example.com/my.js',
        'default-src; script-src-elem web.example.com',
        'default-src; script-src-elem web.example.com:80',
        'default-src; script-src-elem web.example.com:443',
        "default-src; script-src-elem 'nonce-abc'",
        "default-src; script-src-elem 'sha256-/b/HvSeUCyUL0XlV1ZK0nwDk18O2BpM5Scj+dZ1weIY='",

        "default-src; script-src-attr 'nonce-abc'",
        "default-src; script-src-attr 'sha256-/b/HvSeUCyUL0XlV1ZK0nwDk18O2BpM5Scj+dZ1weIY='",

        'default-src; worker-src *',
        'default-src; worker-src moz-extension: *', // mixed with * invalid
        'default-src; worker-src ws:',
        'default-src; worker-src wss:',
        'default-src; worker-src http:',
        'default-src; worker-src https:',
        'default-src; worker-src ftp:',
        'default-src; worker-src http://cdn.example.com/my.js',
        'default-src; worker-src https://cdn.example.com/my.js',
        'default-src; worker-src web.example.com',
        'default-src; worker-src web.example.com:80',
        'default-src; worker-src web.example.com:443',

        // Properly match mixed with other directives
        "default-src; script-src https: 'unsafe-inline'; object-src 'self'",
        "default-src http:; worker-src: 'self'",
        "default-src; script-src-elem https: 'unsafe-inline'; script-src 'self'",
        "default-src; script-src-attr 'self'; script-src *",
      ];

      // Manifest v2 formats.
      const testInvalidValueMV2 = (invalidValue) => {
        const addonLinter = new Linter({ _: ['bar'] });

        const json = validManifestJSON({
          content_security_policy: invalidValue,
        });

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );

        expect(manifestJSONParser.isValid).toEqual(true);
        const { warnings } = addonLinter.collector;
        expect(warnings[0].code).toEqual(messages.MANIFEST_CSP);
        expect(warnings[0].message).toContain('content_security_policy');
      };

      // Manifest v3 formats.
      const testInvalidValueMV3 = (invalidValue) => {
        const addonLinter = new Linter({ _: ['bar'] });

        const contentSecurityPolicy = {
          extension_pages: invalidValue,
        };

        const jsonV3 = validManifestJSON({
          manifest_version: 3,
          content_security_policy: contentSecurityPolicy,
          browser_specific_settings: {
            // The new content_security_policy syntax is only supported
            // on Firefox >= 72.
            gecko: { strict_min_version: '72.0', id: 'some@id' },
          },
        });

        const manifestV3JSONParser = new ManifestJSONParser(
          jsonV3,
          addonLinter.collector,
          { schemaValidatorOptions: { maxManifestVersion: 3 } }
        );

        expect(manifestV3JSONParser.isValid).toEqual(true);
        const { warnings } = addonLinter.collector;

        const keys = Object.keys(contentSecurityPolicy);
        for (let i = 0; i < keys.length; i++) {
          expect(warnings[i].code).toEqual(messages.MANIFEST_CSP);
          expect(warnings[i].message).toContain(
            `content_security_policy.${keys[i]}`
          );
        }
        expect(warnings.length).toBe(1);
      };

      it.each(invalidValues)('on invalid MV2 CSP %s', testInvalidValueMV2);
      it.each(invalidValues)('on invalid MV3 CSP %s', testInvalidValueMV3);
    });

    describe('should not warn on valid values according to Add-On Policies', () => {
      const validValues = [
        'default-src moz-extension:',
        'script-src moz-extension:',
        "script-src  'self' ; object-src 'self' ", // spaces around

        // Mix with other directives
        "script-src 'self'; object-src 'self'",
        "script-src 'none'; object-src 'self'",

        // We only walk through default-src and script-src
        'default-src; style-src http://by.cdn.com/',

        // 'wasm-unsafe-eval' is permitted, despite the unsafe-eval substring.
        "script-src 'self' 'wasm-unsafe-eval'",

        // A secure default-src or script-src is required for the script-src-elem
        // directive to be potentially accepted as secure.
        "default-src; script-src-elem 'self'",
        "default-src; script-src-elem 'none'",

        "default-src; script-src-attr 'self'",
        "default-src; script-src-attr 'none'",

        // 'default-src' is insecure, but the limiting 'script-src' prevents
        // remote script injection
        "default-src *; script-src 'self'",
        "default-src https:; script-src 'self'",
        "default-src example.com; script-src 'self'",
        "default-src http://remote.com/; script-src 'self'",
        "default-src https:; script-src 'wasm-unsafe-eval' 'self'",

        // In theory, script-src should override default-src, and the insecure
        // 'unsafe-eval' directive should be ignored. But the implementation
        // rejects 'unsafe-eval' unconditionally, despite the script-src
        // override. So this test case fails with MANIFEST_CSP_UNSAFE_EVAL.
        // See https://github.com/mozilla/addons-linter/pull/4345#discussion_r881860151
        // "script-src 'wasm-unsafe-eval'; default-src 'unsafe-eval'",
      ];

      const testValidValue = (validValue) => {
        const addonLinter = new Linter({ _: ['bar'] });

        // Manifest v2 format.
        const json = validManifestJSON({
          content_security_policy: validValue,
        });

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );

        expect(manifestJSONParser.isValid).toEqual(true);
        expect(addonLinter.collector.warnings.length).toEqual(0);

        // Manifest v3 format.
        const jsonV3 = validManifestJSON({
          manifest_version: 3,
          content_security_policy: {
            extension_pages: validValue,
            content_scripts: validValue,
            isolated_world: validValue,
          },
          browser_specific_settings: {
            // The new content_security_policy syntax is only supported
            // on Firefox >= 72.
            gecko: { strict_min_version: '72.0', id: 'some@id' },
          },
        });

        const manifestV3JSONParser = new ManifestJSONParser(
          jsonV3,
          addonLinter.collector,
          { schemaValidatorOptions: { maxManifestVersion: 3 } }
        );

        expect(manifestV3JSONParser.isValid).toEqual(true);
        expect(addonLinter.collector.warnings.length).toEqual(0);
      };

      it.each(validValues)('on valid CSP value %s', testValidValue);
    });

    const unsafeEvalValues = [
      "script-src 'self' 'unsafe-eval';",
      "script-src-elem 'self' 'unsafe-eval';",
      "script-src-attr 'self' 'unsafe-eval';",
      // While worker-src does not recognize 'unsafe-eval' in practice, the
      // implementation rejects 'unsafe-eval' in every validated directive.
      // Here we verify that we won't receive duplicate warnings for the same.
      "default-src http: 'unsafe-eval'; script-src 'self' 'unsafe-eval'; worker-src 'unsafe-eval';",
    ];
    it.each(unsafeEvalValues)(
      'Should issue a detailed warning for %s',
      (unsafeEvalValue) => {
        const invalidValue = unsafeEvalValue;
        const addonLinter = new Linter({ _: ['bar'] });

        // Manifest v2 formats.
        const json = validManifestJSON({
          content_security_policy: invalidValue,
        });

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );

        expect(manifestJSONParser.isValid).toEqual(true);
        const { warnings } = addonLinter.collector;
        expect(warnings[0].code).toEqual(messages.MANIFEST_CSP_UNSAFE_EVAL);
        expect(warnings[0].message).toEqual(
          messages.manifestCspUnsafeEval('content_security_policy').message
        );
        expect(warnings[1].code).toEqual(messages.MANIFEST_CSP);
        expect(warnings.length).toEqual(2);

        // Clear any warnings and errors collected.
        addonLinter.collector.warnings = [];
        addonLinter.collector.errors = [];

        // Manifest v3 formats.
        const contentSecurityPolicy = {
          extension_pages: invalidValue,
          content_scripts: invalidValue,
          // Alias for content_scripts.
          isolated_world: invalidValue,
        };

        const jsonV3 = validManifestJSON({
          manifest_version: 3,
          content_security_policy: contentSecurityPolicy,
          browser_specific_settings: {
            // The new content_security_policy syntax is only supported
            // on Firefox >= 72.
            gecko: { strict_min_version: '72.0', id: 'some@id' },
          },
        });

        const manifestV3JSONParser = new ManifestJSONParser(
          jsonV3,
          addonLinter.collector,
          { schemaValidatorOptions: { maxManifestVersion: 3 } }
        );

        expect(manifestV3JSONParser.isValid).toEqual(true);
        const warningsV3 = addonLinter.collector.warnings;

        const keys = Object.keys(contentSecurityPolicy);
        for (let i = 0; i < keys.length; i++) {
          // Expecting 2 codes for each test case: MANIFEST_CSP_UNSAFE_EVAL + MANIFEST_CSP.
          expect(warningsV3[i * 2].code).toEqual(
            messages.MANIFEST_CSP_UNSAFE_EVAL
          );
          expect(warningsV3[i * 2].message).toContain(
            `content_security_policy.${keys[i]}`
          );
          expect(warningsV3[i * 2 + 1].code).toEqual(messages.MANIFEST_CSP);
        }
        expect(warningsV3.length).toEqual(6);
      }
    );

    // See: https://github.com/mozilla/addons-linter/issues/5194
    it.each([[true], { extension_pages: true }, null])(
      'should handle non-string values - %o',
      (content_security_policy) => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({ content_security_policy });

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );

        const { errors } = addonLinter.collector;
        expect(errors[0]).toMatchObject({
          code: messages.MANIFEST_FIELD_INVALID.code,
          message: '"/content_security_policy" must be string',
        });
        expect(manifestJSONParser.isValid).toEqual(false);
      }
    );
  });

  describe('update_url', () => {
    // Chrome Web Extensions put their `update_url` in the root of their
    // manifest, which Firefox ignores. We should notify the user it will
    // be ignored, but that's all.
    it('is allowed but should notify in the manifest', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ update_url: 'https://foo.com/bar' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { selfHosted: false }
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const { notices } = addonLinter.collector;
      expect(notices[0].code).toEqual(messages.MANIFEST_UNUSED_UPDATE.code);
      expect(notices[0].message).toContain('update_url');
    });

    // browser_specific_settings.gecko.update_url isn't allowed if the add-on is
    // being hosted on AMO.
    it('is not allowed', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_specific_settings: {
          gecko: {
            update_url: 'https://foo.com/bar',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { selfHosted: false }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.MANIFEST_UPDATE_URL.code);
      expect(errors[0].message).toContain('update_url');
    });

    it('emits a warning for privileged extensions', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_specific_settings: {
          gecko: {
            update_url: 'https://foo.com/bar',
          },
        },
      });

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        {
          selfHosted: false,
          schemaValidatorOptions: {
            privileged: true,
          },
        }
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.errors.length).toBe(0);
      const { warnings } = addonLinter.collector;
      expect(warnings[0].code).toEqual(messages.MANIFEST_UPDATE_URL.code);
      expect(warnings[0].message).toContain('update_url');
    });

    it('is not an issue if self-hosted and privileged', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_specific_settings: {
          gecko: {
            update_url: 'https://foo.com/bar',
          },
        },
      });

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        {
          selfHosted: true,
          schemaValidatorOptions: {
            privileged: true,
          },
        }
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.errors).toEqual([]);
      expect(addonLinter.collector.warnings).toEqual([]);
    });

    it('is not an issue if self-hosted', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_specific_settings: {
          gecko: {
            update_url: 'https://foo.com/bar',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { selfHosted: true }
      );
      manifestJSONParser.selfHosted = true;
      expect(manifestJSONParser.isValid).toEqual(true);
      expect(addonLinter.collector.warnings.length).toBe(0);
    });

    it('emits an error when the update_url is defined in an enterprise add-on', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some enterprise add-on',
          version: '1',
          browser_specific_settings: {
            gecko: {
              id: '@test-id',
              admin_install_only: true,
              update_url: 'https://example.org',
            },
          },
        }),
        linter.collector,
        { isEnterprise: true }
      );

      expect(manifestJSONParser.isValid).toEqual(false);
      expect(linter.collector.warnings).toEqual([]);
      expect(linter.collector.errors).toEqual([
        expect.objectContaining(messages.MANIFEST_UPDATE_URL),
      ]);
    });

    it('does not emit an error when the update_url is defined in a self-hosted add-on', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some unlisted add-on',
          version: '1',
          browser_specific_settings: {
            gecko: {
              id: '@test-id',
              update_url: 'https://example.org',
            },
          },
        }),
        linter.collector,
        { selfHosted: true }
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(linter.collector.warnings).toEqual([]);
      expect(linter.collector.errors).toEqual([]);
    });
  });

  describe('schema error overrides', () => {
    // https://github.com/mozilla/addons-linter/issues/732
    it.each([
      [
        'MV2',
        {
          manifest_version: 2,
          schemaValidatorOptions: {},
          expectedRequiredProps: '"scripts" or "page"',
        },
      ],
      [
        'MV3',
        {
          manifest_version: 3,
          schemaValidatorOptions: {
            maxManifestVersion: 3,
            enableBackgroundServiceWorker: true,
          },
          expectedRequiredProps: '"service_worker", "scripts" or "page"',
        },
      ],
    ])(
      'reports missing required background properties (%s)',
      (_variantName, variantTestOptions) => {
        const {
          manifest_version,
          schemaValidatorOptions,
          expectedRequiredProps,
        } = variantTestOptions;
        const addonLinter = new Linter({ _: ['bar'] });
        // 'scripts' intentionally misspelled as 'script'.
        const json = validManifestJSON({
          manifest_version,
          background: { script: ['background.js'] },
        });
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { schemaValidatorOptions }
        );
        const { errors } = addonLinter.collector;
        const expectedErrorMessage = `"/background" requires at least one of ${expectedRequiredProps}.`;
        expect(errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              instancePath: '/background',
              code: messages.MANIFEST_FIELD_REQUIRED.code,
              message: expect.stringMatching(expectedErrorMessage),
            }),
          ])
        );
        expect(manifestJSONParser.isValid).toEqual(false);
      }
    );

    it('does not break when background.scripts is not an array', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        background: { scripts: 'background.js' },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      assertHasMatchingError(errors, {
        code: messages.MANIFEST_FIELD_INVALID.code,
        message: '"/background/scripts" must be array',
      });
    });
  });

  describe('default_locale', () => {
    it('error if missing messages.json', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ default_locale: 'fr' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: { files: {} } }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.NO_MESSAGES_FILE.code);
    });

    it('valid if not specified', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({});
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('valid if file present', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ default_locale: 'fr' });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: { files: { '_locales/fr/messages.json': {} } } }
      );
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('error if default_locale missing but messages.json present', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: { files: { '_locales/fr/messages.json': {} } } }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      const { errors } = addonLinter.collector;
      expect(errors[0].code).toEqual(messages.NO_DEFAULT_LOCALE.code);
    });

    const messagesPaths = [
      '_locales/messages.json',
      's_locales/en/messages.json',
      '_locales/en/messages.json.extra',
      '_locales/en',
      '_locales',
    ];

    messagesPaths.forEach((path) => {
      it(`valid if default_locale missing and ${path}`, () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON();
        const files = {};
        files[path] = {};
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { io: { files } }
        );
        expect(manifestJSONParser.isValid).toEqual(true);
        const { errors } = addonLinter.collector;
        expect(errors).toEqual([]);
      });
    });
  });

  describe('icons', () => {
    it('does not enforce utf-8 encoding on reading binary images files', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: 'icons/icon-32.png',
          64: 'icons/icon.svg',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
        'icons/icon.svg': '<svg></svg>',
      };

      const fakeIO = getStreamableIO(files);

      fakeIO.getFileAsStream = jest.fn(fakeIO.getFileAsStream);

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: fakeIO }
      );

      await manifestJSONParser.validateIcons();

      // Expect getFileAsStream to have been called twice (for the png file
      // and the svg file).
      expect(fakeIO.getFileAsStream.mock.calls.length).toBe(2);

      expect(fakeIO.getFileAsStream.mock.calls[0]).toEqual([
        'icons/icon-32.png',
        { encoding: null },
      ]);
      expect(fakeIO.getFileAsStream.mock.calls[1]).toEqual([
        'icons/icon.svg',
        { encoding: 'utf-8' },
      ]);
    });

    it('does not add errors if the icons are in the package', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: 'icons/icon-32.png',
          64: 'icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
        'icons/icon-64.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('supports "absolute" paths', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: '/icons/icon-32.png',
          64: '/icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
        'icons/icon-64.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('supports ./ relative paths', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: './icons/icon-32.png',
          64: './icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
        'icons/icon-64.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('supports SVG fragments', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: './icons/icon.svg',
          64: './icons/icon.svg#full',
        },
      });
      const files = {
        'icons/icon.svg': '<svg></svg>',
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('allows .. relative paths that resolve in the package', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: '../icons/icon-32.png',
          64: 'icons/../../foo/../icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
        'icons/icon-64.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('does not allow invalid .. relative paths', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: 'foo/bar/../icons/icon-32.png',
          64: 'icons/../../foo/icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
        'icons/icon-64.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );

      await manifestJSONParser.validateIcons();
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description: 'Icon could not be found at "foo/icons/icon-32.png".',
      });
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description: 'Icon could not be found at "foo/icons/icon-64.png".',
      });
    });

    it('adds an error if the icon is not in the package', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: 'icons/icon-32.png',
          64: 'icons/icon-64.png',
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );

      await manifestJSONParser.validateIcons();
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description: 'Icon could not be found at "icons/icon-64.png".',
      });
    });

    it('adds an error if the browser_action icon is not in the package', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_action: {
          default_icon: {
            32: 'icons/icon-32.png',
            64: 'icons/icon-64.png',
          },
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );

      await manifestJSONParser.validateIcons();
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description: 'Icon could not be found at "icons/icon-64.png".',
      });
    });

    it('does not add a warning if the browser_action default icon file is valid', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const icon = 'tests/fixtures/default.png';
      const json = validManifestJSON({
        // Avoid any type of warning by setting the appropriate firefox version.
        browser_specific_settings: {
          gecko: {
            id: '{daf44bf7-a45e-4450-979c-91cf07434c3d}',
            strict_min_version: '55.0.0',
          },
          gecko_android: {
            strict_min_version: '120.0',
          },
        },
        browser_action: {
          default_icon: icon,
        },
      });
      const files = {
        [icon]: fs.createReadStream(icon),
      };

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );

      await manifestJSONParser.validateIcons();

      expect(manifestJSONParser.isValid).toEqual(true);
      const { warnings } = addonLinter.collector;
      expect(warnings.length).toEqual(0);
    });

    it('adds an error if the browser_action string icon is not in the package', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_action: {
          default_icon: 'icons/icon.png',
        },
      });
      const files = {};
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );

      await manifestJSONParser.validateIcons();
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description: 'Icon could not be found at "icons/icon.png".',
      });
    });

    it('adds an error if the browser_action theme icon is not in the package', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_action: {
          theme_icons: [
            {
              light: 'icons/light-32.png',
              dark: 'icons/dark-32.png',
              size: 32,
            },
          ],
        },
      });
      const files = {
        'icons/light-32.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );

      await manifestJSONParser.validateIcons();
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description: 'Icon could not be found at "icons/dark-32.png".',
      });
    });

    it('adds an error if the page_action icon is not in the package', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        page_action: {
          default_icon: {
            32: 'icons/icon-32.png',
            64: 'icons/icon-64.png',
          },
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );

      await manifestJSONParser.validateIcons();
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description: 'Icon could not be found at "icons/icon-64.png".',
      });
    });

    it('adds an error if the sidebar_action icon is not in the package', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        sidebar_action: {
          default_icon: {
            32: 'icons/icon-32.png',
            64: 'icons/icon-64.png',
          },
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );

      await manifestJSONParser.validateIcons();
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(addonLinter.collector.errors, {
        code: messages.MANIFEST_ICON_NOT_FOUND,
        message:
          'An icon defined in the manifest could not be found in the package.',
        description: 'Icon could not be found at "icons/icon-64.png".',
      });
    });

    it('filters duplicate errors if a missing icon is reused', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        browser_action: {
          default_icon: {
            32: 'icons/icon-32.png',
            64: 'icons/icon-64.png',
          },
        },
        sidebar_action: {
          default_icon: {
            32: 'icons/icon-32.png',
            64: 'icons/icon-64.png',
          },
        },
      });
      const files = {
        'icons/icon-32.png': EMPTY_PNG.toString('binary'),
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );

      await manifestJSONParser.validateIcons();
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingErrorCount(
        addonLinter.collector.errors,
        {
          code: messages.MANIFEST_ICON_NOT_FOUND,
          message:
            'An icon defined in the manifest could not be found in the package.',
          description: 'Icon could not be found at "icons/icon-64.png".',
        },
        1
      );
    });

    it('adds a warning if the icon does not have a valid extension', async () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        icons: {
          32: 'icons/icon-32.txt',
          48: 'icons/icon.svg#frag',
          64: 'icons/icon-64.html',
          96: 'icons/icon.svg',
          128: 'tests/fixtures/icon-128.png',
        },
      });
      const files = {
        'icons/icon-32.txt': 'some random text',
        'icons/icon-64.html': '<html></html>',
        'tests/fixtures/icon-128.png': fs.createReadStream(
          'tests/fixtures/icon-128.png'
        ),
        'icons/icon.svg': '<svg></svg>',
      };
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: getStreamableIO(files) }
      );

      await manifestJSONParser.validateIcons();
      expect(manifestJSONParser.isValid).toBeTruthy();
      const { warnings } = addonLinter.collector;
      expect(warnings.length).toEqual(4);
      expect(warnings[0].code).toEqual(messages.WRONG_ICON_EXTENSION.code);
      expect(warnings[1].code).toEqual(messages.WRONG_ICON_EXTENSION.code);
    });

    describe('validate icon', () => {
      it('does not add a warning if the icon file is not corrupt', async () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const icon32 = 'tests/fixtures/default.png';
        const icon2048 = 'tests/fixtures/default.svg';
        const size32 = 32;
        const size2048 = 2048;
        const json = validManifestJSON({
          icons: {
            [size32]: icon32,
            [size2048]: icon2048,
          },
        });
        const files = {
          [icon32]: fs.createReadStream(icon32),
          [icon2048]: fs.createReadStream(icon2048),
        };

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { io: getStreamableIO(files) }
        );

        await Promise.all([
          manifestJSONParser.validateIcon(icon32, size32),
          manifestJSONParser.validateIcon(icon2048, size2048),
        ]);
        expect(manifestJSONParser.isValid).toBeTruthy();
        const { warnings } = addonLinter.collector;
        expect(warnings.length).toEqual(0);
      });

      it('adds a warning if the icon file is corrupt', async () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const icon32 = 'tests/fixtures/default-corrupted.png';
        const size32 = 32;
        const json = validManifestJSON({
          icons: {
            [size32]: icon32,
          },
        });
        const files = {
          [icon32]: fs.createReadStream(icon32),
        };

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { io: getStreamableIO(files) }
        );

        await manifestJSONParser.validateIcon(icon32, size32);
        expect(manifestJSONParser.isValid).toBeTruthy();
        const { warnings } = addonLinter.collector;
        expect(warnings.length).toEqual(1);
      });

      it('adds a warning if the image size is not the same as mentioned', async () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const icon33 = 'tests/fixtures/icon-33.png';
        const size32 = 32;
        const json = validManifestJSON({
          icons: {
            [size32]: icon33,
          },
        });
        const files = {
          [icon33]: fs.createReadStream(icon33),
        };
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { io: getStreamableIO(files) }
        );

        await manifestJSONParser.validateIcon(icon33, size32);
        expect(manifestJSONParser.isValid).toBeTruthy();
        const { warnings } = addonLinter.collector;
        expect(warnings.length).toEqual(1);
        assertHasMatchingError(warnings, {
          code: messages.ICON_SIZE_INVALID,
          message: 'The size of the icon does not match the manifest.',
          description:
            'Expected icon at "tests/fixtures/icon-33.png" to be 32 pixels wide but was 33.',
        });
      });

      it('does not add a warning if the icon is SVG but the image size is not the same as mentioned', async () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const icon32 = 'tests/fixtures/default.svg';
        const size32 = 32;
        const json = validManifestJSON({
          icons: {
            [size32]: icon32,
          },
        });
        const files = {
          [icon32]: fs.createReadStream(icon32),
        };
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { io: getStreamableIO(files) }
        );

        await manifestJSONParser.validateIcon(icon32, size32);
        expect(manifestJSONParser.isValid).toBeTruthy();
        const { warnings } = addonLinter.collector;
        expect(warnings.length).toEqual(0);
      });

      it('does add a warning if the icon is a non square svg', async () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const icon32 = 'tests/fixtures/rectangle.svg';
        const size32 = 32;
        const json = validManifestJSON({
          icons: {
            [size32]: icon32,
          },
        });
        const files = {
          [icon32]: fs.createReadStream(icon32),
        };
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { io: getStreamableIO(files) }
        );

        await manifestJSONParser.validateIcon(icon32, size32);
        expect(manifestJSONParser.isValid).toBeTruthy();
        const { warnings } = addonLinter.collector;
        expect(warnings.length).toEqual(1);
        expect(warnings[0].code).toEqual(messages.ICON_NOT_SQUARE);
      });

      it('adds an error if the dimensions of the image are not the same', async () => {
        const addonLinter = new Linter({ _: ['bar'] });
        const icon32 = 'tests/fixtures/rectangle.png';
        const size32 = 32;
        const json = validManifestJSON({
          icons: {
            [size32]: icon32,
          },
        });
        const files = {
          [icon32]: fs.createReadStream(icon32),
        };
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector,
          { io: getStreamableIO(files) }
        );

        await manifestJSONParser.validateIcon(icon32, size32);
        expect(manifestJSONParser.isValid).toBeFalsy();
        const { errors } = addonLinter.collector;
        expect(errors.length).toEqual(1);
        expect(errors[0].code).toEqual(messages.ICON_NOT_SQUARE);
      });
    });
  });

  describe('background', () => {
    it('does not add errors if the script exists', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        background: { scripts: ['foo.js'] },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: { 'foo.js': '' } } }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('does error if the script does not exist', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        background: { scripts: ['foo.js'] },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: {} } }
      );
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_BACKGROUND_FILE_NOT_FOUND,
        message:
          'A background script defined in the manifest could not be found.',
        description: 'Background script could not be found at "foo.js".',
      });
    });

    it('does not add errors if the page exists', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        background: { page: 'foo.html' },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: { 'foo.html': '' } } }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('does error if the page does not exist', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        background: { page: 'foo.html' },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: {} } }
      );
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_BACKGROUND_FILE_NOT_FOUND,
        message:
          'A background page defined in the manifest could not be found.',
        description: 'Background page could not be found at "foo.html".',
      });
    });

    it('does error if background.service_worker is being used', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        background: { service_worker: 'background_worker.js' },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: { 'background_worker.js': '' } } }
      );

      expect(manifestJSONParser.isValid).toBeFalsy();
      expect(linter.collector.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'MANIFEST_FIELD_UNSUPPORTED',
            message: expect.stringMatching(
              /"\/background\/service_worker" is not supported/
            ),
          }),
        ])
      );
    });

    // See: https://bugzilla.mozilla.org/show_bug.cgi?id=1860304
    it.each([
      { scripts: ['bg.js'] },
      { page: 'bg.html' },
      { scripts: [], page: 'bg.html' },
    ])(
      'emits a warning when background.service_worker is being used in combination with %o',
      (backgroundProps) => {
        const linter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          background: {
            service_worker: 'background_worker.js',
            ...backgroundProps,
          },
        });
        // eslint-disable-next-line no-unused-vars
        const manifestJSONParser = new ManifestJSONParser(
          json,
          linter.collector,
          {
            io: {
              files: { 'background_worker.js': '', 'bg.js': '', 'bg.html': '' },
            },
          }
        );

        expect(linter.collector.errors).toEqual([]);
        expect(linter.collector.warnings).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: 'MANIFEST_FIELD_UNSUPPORTED',
              message: expect.stringMatching(
                /"\/background\/service_worker" is not supported/
              ),
            }),
          ])
        );
        expect(manifestJSONParser.isValid).toEqual(true);
      }
    );

    it('does not allow background.service_worker unless enabled by feature flag', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        manifest_version: 3,
        background: { service_worker: 'background_worker.js' },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: { 'background_worker.js': '' } },
          schemaValidatorOptions: {
            maxManifestVersion: 3,
          },
        }
      );

      expect(manifestJSONParser.isValid).toBeFalsy();
      expect(linter.collector.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'MANIFEST_FIELD_UNSUPPORTED',
            message: expect.stringMatching(
              /"\/background\/service_worker" is not supported/
            ),
            file: 'manifest.json',
          }),
        ])
      );
    });

    it('does not error if background.service_worker is used with manifest_version: 3 and support is enabled', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        manifest_version: 3,
        background: { service_worker: 'background_worker.js' },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: { 'background_worker.js': '' } },
          schemaValidatorOptions: {
            maxManifestVersion: 3,
            enableBackgroundServiceWorker: true,
          },
        }
      );

      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('does not error if background.page is used with manifest_version: 3', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        manifest_version: 3,
        background: { page: 'background_page.html' },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: { 'background_page.html': '' } },
          schemaValidatorOptions: {
            maxManifestVersion: 3,
          },
        }
      );

      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('does not error if background.scripts is used with manifest_version: 3', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        manifest_version: 3,
        background: { scripts: ['background_script.js'] },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: { 'background_script.js': '' } },
          schemaValidatorOptions: {
            maxManifestVersion: 3,
          },
        }
      );

      expect(manifestJSONParser.isValid).toBeTruthy();
    });
  });

  describe('content_scripts', () => {
    it('does not add errors if the script exists', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        content_scripts: [
          {
            matches: ['<all_urls>'],
            js: ['content_scripts/foo.js'],
            css: ['content_scripts/bar.css'],
          },
        ],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: {
            files: {
              'content_scripts/foo.js': '',
              'content_scripts/bar.css': '',
            },
          },
        }
      );
      expect(manifestJSONParser.isValid).toBeTruthy();
    });

    it('does error if the script does not exist', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        content_scripts: [
          {
            matches: ['<all_urls>'],
            js: ['content_scripts/foo.js'],
            css: ['content_scripts/bar.css'],
          },
        ],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: { 'content_scripts/bar.css': '' } } }
      );
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_CONTENT_SCRIPT_FILE_NOT_FOUND,
        message: 'A content script defined in the manifest could not be found.',
        description:
          'Content script defined in the manifest could not be found at "content_scripts/foo.js".',
      });
    });

    it('does error if the css does not exist', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        content_scripts: [
          {
            matches: ['<all_urls>'],
            js: ['content_scripts/foo.js'],
            css: ['content_scripts/bar.css'],
          },
        ],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: { 'content_scripts/foo.js': '' } } }
      );
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_CONTENT_SCRIPT_FILE_NOT_FOUND,
        message:
          'A content script css file defined in the manifest could not be found.',
        description:
          'Content script css file defined in the manifest could not be found at "content_scripts/bar.css".',
      });
    });

    it('does error if matches entry is blocked', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        content_scripts: [
          {
            matches: ['http://wbgdrb.applythrunet.co.in/GetAdmitINTV.aspx'],
            js: ['content_scripts/foo.js'],
          },
        ],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: { 'content_scripts/foo.js': '' } } }
      );
      expect(manifestJSONParser.isValid).toBeFalsy();
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_INVALID_CONTENT.code,
        message: 'Forbidden content found in add-on.',
        description: 'This add-on contains forbidden content.',
      });
    });
  });

  describe('deprecated properties', () => {
    // NOTE: this test currently checks that we don't add any unexpected validation errors
    // for schema properties marked as deprecated (until we add proper handling for them).
    it('does not add validation error for manifest properties marked as deprecated', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        options_ui: {
          page: 'options.html',
          unexpected_property: true,
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        { io: { files: { 'options.html': '' } } }
      );

      // Ignore warnings triggered by the rules related to @mdn/browser-compat-data.
      const warnings = linter.collector.warnings.filter((msg) => {
        return msg.code !== 'KEY_FIREFOX_ANDROID_UNSUPPORTED_BY_MIN_VERSION';
      });

      expect(manifestJSONParser.isValid).toBeTruthy();
      expect(linter.collector.errors.length).toBe(0);
      expect(warnings.length).toBe(0);
    });
  });

  describe('dictionary', () => {
    it('supports simple valid dictionary', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: { 'path/to/fr.dic': '', 'path/to/fr.aff': '' } },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('does error if the dictionary file does not exist', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);

      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_DICT_NOT_FOUND,
        message:
          'A dictionary file defined in the manifest could not be found.',
        description:
          'Dictionary file defined in the manifest could not be found at "path/to/fr.dic".',
      });
    });

    it('does error if the dictionary file exists but not the .aff file', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: { '/path/to/fr.dic': '' } },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);

      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_DICT_NOT_FOUND,
        message:
          'A dictionary file defined in the manifest could not be found.',
        description:
          'Dictionary file defined in the manifest could not be found at "path/to/fr.aff".',
      });
    });

    it('throws error on dictionary with missing applications', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = JSON.stringify({
        manifest_version: 2,
        name: 'My French Dictionary',
        version: '57.0a1',
        dictionaries: {
          fr: '/path/to/fr.dic',
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_DICT_MISSING_ID.code,
        message: 'The manifest contains a dictionary but no id property.',
        description:
          'A dictionary was found in the manifest, but there was no id set.',
      });
    });

    it('throws error on dictionary with missing applications->gecko', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({
        browser_specific_settings: {},
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_DICT_MISSING_ID.code,
        message: 'The manifest contains a dictionary but no id property.',
        description:
          'A dictionary was found in the manifest, but there was no id set.',
      });
    });

    it('throws error on dictionary with missing applications->gecko->id', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({
        browser_specific_settings: { gecko: {} },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_DICT_MISSING_ID.code,
        message: 'The manifest contains a dictionary but no id property.',
        description:
          'A dictionary was found in the manifest, but there was no id set.',
      });
    });

    it('throws error on dictionary file not ending with .dic', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({
        dictionaries: { fr: 'invalid.txt' },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
    });

    it('throws error on add-on containing multiple dictionaries', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({
        dictionaries: { fr: 'fr.dic', de: 'de.dic' },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_MULTIPLE_DICTS.code,
        message: 'The manifest contains multiple dictionaries.',
        description:
          'Multiple dictionaries were defined in the manifest, which is unsupported.',
      });
    });

    it('throws error on dictionary containing empty dictionaries object', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({ dictionaries: {} });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_EMPTY_DICTS.code,
        message:
          'The manifest contains a dictionaries object, but it is empty.',
        description:
          'A dictionaries object was defined in the manifest, but it was empty.',
      });
    });

    it('throws error on additional properties', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validDictionaryManifestJSON({ content_scripts: ['foo.js'] });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message: '"/" must NOT have additional properties',
        description: 'Your JSON file could not be parsed.',
      });
    });
  });

  describe('langpack', () => {
    it('supports simple valid langpack', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validLangpackManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('adds a validation error on missing langpack_id', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validLangpackManifestJSON({ langpack_id: null });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
    });

    it('adds a validation error on additional properties', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validLangpackManifestJSON({ content_scripts: ['foo.js'] });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message: '"/" must NOT have additional properties',
        description: 'Your JSON file could not be parsed.',
      });
    });
  });

  describe('static theme', () => {
    it('supports simple valid static theme', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validStaticThemeManifestJSON();
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('adds a validation error on additional properties', () => {
      const linter = new Linter({ _: ['bar'] });
      const json = validStaticThemeManifestJSON({
        content_scripts: ['foo.js'],
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        linter.collector,
        {
          io: { files: {} },
        }
      );
      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message: '"/" must NOT have additional properties',
        description: 'Your JSON file could not be parsed.',
      });
    });

    it('adds a validation error on missing theme image files', async () => {
      const propName = 'theme.images.frame';
      const fileName = 'missing-image-file.png';

      const linter = new Linter({ _: ['bar'] });
      const manifest = validStaticThemeManifestJSON({
        theme: {
          images: {
            frame: fileName,
          },
        },
      });

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        {
          io: { files: {} },
        }
      );

      await manifestJSONParser.validateStaticThemeImages();

      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_THEME_IMAGE_NOT_FOUND,
        message: `Theme image for "${propName}" could not be found in the package`,
        description: `Theme image for "${propName}" could not be found at "${fileName}"`,
      });
    });

    it('adds a validation error on theme image file with unsupported file extension', async () => {
      const files = {
        'unsupported-image-ext.tiff': '',
        'unsupported-image-ext.webp': '',
      };
      const fileNames = Object.keys(files);

      const linter = new Linter({ _: ['bar'] });
      const manifest = validStaticThemeManifestJSON({
        theme: {
          images: {
            frame: fileNames[0],
            additional_backgrounds: fileNames[1],
          },
        },
      });

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        { io: { files } }
      );

      await manifestJSONParser.validateStaticThemeImages();

      expect(manifestJSONParser.isValid).toEqual(false);

      for (const name of fileNames) {
        assertHasMatchingError(linter.collector.errors, {
          code: messages.MANIFEST_THEME_IMAGE_WRONG_EXT,
          message: `Theme image file has an unsupported file extension`,
          description: `Theme image file at "${name}" has an unsupported file extension`,
        });
      }
    });

    it('adds a validation error on theme image file in unsupported formats', async () => {
      const files = {
        'tiff-image-with-png-filext.png': EMPTY_TIFF,
        'webp-image-with-png-filext.png': EMPTY_WEBP,
      };
      const fileNames = Object.keys(files);
      const fileMimes = ['image/tiff', 'image/webp'];

      const linter = new Linter({ _: ['bar'] });
      const manifest = validStaticThemeManifestJSON({
        theme: {
          images: {
            frame: fileNames[0],
            addional_backgrounds: fileNames[1],
          },
        },
      });

      const fakeIO = getStreamableIO(files);
      fakeIO.getFileAsStream = jest.fn(fakeIO.getFileAsStream);

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        { io: fakeIO }
      );

      await manifestJSONParser.validateStaticThemeImages();

      // Expect getFileAsStream to have been called to read the
      // image file.
      expect(fakeIO.getFileAsStream.mock.calls.length).toBe(2);
      for (let i = 0; i < fileNames; i++) {
        expect(fakeIO.getFileAsStream.mock.calls[i]).toEqual([
          fileNames[i],
          { encoding: null },
        ]);
      }

      expect(manifestJSONParser.isValid).toEqual(false);

      for (let i = 0; i < fileNames; i++) {
        const fileName = fileNames[i];
        const fileMime = fileMimes[i];
        assertHasMatchingError(linter.collector.errors, {
          code: messages.MANIFEST_THEME_IMAGE_WRONG_MIME,
          message: `Theme image file has an unsupported mime type`,
          description: `Theme image file at "${fileName}" has the unsupported mime type "${fileMime}"`,
        });
      }
    });

    it('adds a validation warning on supported theme image mime with file extension mismatch', async () => {
      const fileName = 'png-image-with-gif-filext.gif';
      const fileMime = 'image/png';

      const linter = new Linter({ _: ['bar'] });
      const manifest = validStaticThemeManifestJSON({
        theme: {
          images: {
            frame: fileName,
          },
        },
      });

      const files = { [fileName]: EMPTY_PNG };
      const fakeIO = getStreamableIO(files);
      fakeIO.getFileAsStream = jest.fn(fakeIO.getFileAsStream);

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        { io: fakeIO }
      );

      await manifestJSONParser.validateStaticThemeImages();

      // Expect getFileAsStream to have been called to read the
      // image file.
      expect(fakeIO.getFileAsStream.mock.calls.length).toBe(1);
      expect(fakeIO.getFileAsStream.mock.calls[0]).toEqual([
        fileName,
        { encoding: null },
      ]);

      expect(manifestJSONParser.isValid).toEqual(true);
      assertHasMatchingError(linter.collector.warnings, {
        code: messages.MANIFEST_THEME_IMAGE_MIME_MISMATCH,
        message: `Theme image file mime type does not match its file extension`,
        description: oneLine`Theme image file extension at "${fileName}"
                             does not match its actual mime type "${fileMime}"`,
      });
    });

    it('adds a validation error if unable to validate theme images files mime type', async () => {
      const fileName = 'corrupted-image-file.png';

      const linter = new Linter({ _: ['bar'] });
      const manifest = validStaticThemeManifestJSON({
        theme: {
          images: {
            frame: fileName,
          },
        },
      });

      // Set the image file content as empty, so that the validation is going to be
      // unable to retrive the file mime type.
      const files = { [fileName]: '' };
      const fakeIO = getStreamableIO(files);
      fakeIO.getFileAsStream = jest.fn(fakeIO.getFileAsStream);

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        { io: fakeIO }
      );

      await manifestJSONParser.validateStaticThemeImages();

      // Expect getFileAsStream to have been called to read the
      // image file.
      expect(fakeIO.getFileAsStream.mock.calls.length).toBe(1);
      expect(fakeIO.getFileAsStream.mock.calls[0]).toEqual([
        fileName,
        { encoding: null },
      ]);

      expect(manifestJSONParser.isValid).toEqual(false);
      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_THEME_IMAGE_CORRUPTED,
        message: `Corrupted theme image file`,
        description: `Theme image file at "${fileName}" is corrupted`,
      });
    });

    it('validates all image paths when the manifest property value is an array', async () => {
      const linter = new Linter({ _: ['bar'] });
      const imageFiles = [
        'bg1.svg',
        'bg2.png',
        'bg2-apng.png',
        'bg3.gif',
        'bg4.jpg',
        'bg4-1.jpeg',
      ];
      const manifest = validStaticThemeManifestJSON({
        theme: {
          images: {
            additional_backgrounds: imageFiles,
          },
        },
      });

      const files = {
        'bg1.svg': EMPTY_SVG,
        'bg2.png': EMPTY_PNG,
        'bg2-apng.png': EMPTY_APNG,
        'bg3.gif': EMPTY_GIF,
        'bg4.jpg': EMPTY_JPG,
        'bg4-1.jpeg': EMPTY_JPG,
      };
      const fakeIO = getStreamableIO(files);
      fakeIO.getFileAsStream = jest.fn(fakeIO.getFileAsStream);

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        { io: fakeIO }
      );

      await manifestJSONParser.validateStaticThemeImages();

      // Expect getFileAsStream to have been called to read all the image files.
      expect(fakeIO.getFileAsStream.mock.calls.length).toBe(imageFiles.length);
      expect(fakeIO.getFileAsStream.mock.calls.map((call) => call[0])).toEqual(
        imageFiles
      );

      const { errors, warnings } = linter.collector;
      expect({ errors, warnings }).toEqual({
        errors: [],
        warnings: [],
      });
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('considers theme.images as optional', async () => {
      const linter = new Linter({ _: ['bar'] });
      const manifest = validStaticThemeManifestJSON({
        theme: {
          colors: {
            frame: '#adb09f',
            tab_background_text: '#000',
            background_tab_text: 'rgba(255, 192, 0, 0)',
            bookmark_text: 'rgb(255, 255, 255),',
            toolbar_field_text: 'hsl(120, 100%, 50%)',
          },
        },
      });

      const manifestJSONParser = new ManifestJSONParser(
        manifest,
        linter.collector,
        { io: { files: {} } }
      );

      await manifestJSONParser.validateStaticThemeImages();

      const { errors, warnings } = linter.collector;
      expect({ errors, warnings }).toEqual({
        errors: [],
        warnings: [],
      });
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    describe('deprecated LWT aliases', () => {
      it('does add validation errors for LWT alias manifest properties marked as deprecated', () => {
        const linter = new Linter({ _: ['bar'] });
        const manifest = validStaticThemeManifestJSON({
          theme: {
            images: {
              headerURL: 'header.png',
            },
            colors: {
              accentcolor: '#000',
              textcolor: '#000',
              // This is not a deprecated property anymore, but it is still
              // part of this test to ensure we don't raise linting errors
              // for it.
              toolbar_text: '#000',
            },
          },
        });
        const manifestJSONParser = new ManifestJSONParser(
          manifest,
          linter.collector,
          { io: { files: {} } }
        );

        const { errors, warnings } = linter.collector;

        expect(manifestJSONParser.isValid).toBeFalsy();

        expect(warnings).toEqual([]);

        const actualErrors = errors.map((err) => {
          const { code, instancePath, file, message, description } = err;
          return { code, instancePath, file, message, description };
        });

        const expectedErrors = [
          {
            code: messages.MANIFEST_THEME_LWT_ALIAS.code,
            file: 'manifest.json',
            instancePath: '/theme/images/headerURL',
            message: 'This theme LWT alias has been removed in Firefox 70.',
            description:
              'See https://mzl.la/2T11Lkc (MDN Docs) for more information.',
          },
          {
            code: messages.MANIFEST_THEME_LWT_ALIAS.code,
            file: 'manifest.json',
            instancePath: '/theme/colors/accentcolor',
            message: 'This theme LWT alias has been removed in Firefox 70.',
            description:
              'See https://mzl.la/2T11Lkc (MDN Docs) for more information.',
          },
          {
            code: messages.MANIFEST_THEME_LWT_ALIAS.code,
            file: 'manifest.json',
            instancePath: '/theme/colors/textcolor',
            message: 'This theme LWT alias has been removed in Firefox 70.',
            description:
              'See https://mzl.la/2T11Lkc (MDN Docs) for more information.',
          },
        ];

        expect(actualErrors).toEqual(expectedErrors);
      });
    });
  });

  describe('locales', () => {
    it('emits an error when messages.json is missing in language directory', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        default_locale: 'en',
      });
      const directory = {
        files: {
          // Currently ignored because there is no other files in this
          // directory and the XPI IO reader does not add trailing slashes,
          // even for directories.
          '_locales/.git': { size: 0 },
          '_locales/en/messages.json': { size: 1000 },
          '_locales/de/messages.json': { size: 1120 },
          '_locales/hi/README.md': { size: 0 },
          '_locales/_locales/.gitkeep': { size: 0 },
          '_locales/.github/CODEOWNERS': { size: 1 },
          '_locales/.github/workflows/jsonlint.yml': { size: 1 },
        },
      };

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: directory }
      );

      expect(manifestJSONParser.isValid).toEqual(false);

      const { errors } = addonLinter.collector;
      expect(errors.length).toEqual(3);
      expect(errors[0]).toEqual(
        expect.objectContaining({
          code: messages.NO_MESSAGES_FILE_IN_LOCALES,
          description: expect.stringMatching(`file missing in "_locales/hi"`),
        })
      );
      expect(errors[1]).toEqual(
        expect.objectContaining({
          code: messages.NO_MESSAGES_FILE_IN_LOCALES,
          description: expect.stringMatching(
            `file missing in "_locales/_locales"`
          ),
        })
      );
      expect(errors[2]).toEqual(
        expect.objectContaining({
          code: messages.NO_MESSAGES_FILE_IN_LOCALES,
          description: expect.stringMatching(
            `file missing in "_locales/.github"`
          ),
        })
      );
    });

    it('does not emit an error when messages.json is not missing in language directory', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        default_locale: 'en',
      });
      const directory = {
        files: {
          '_locales/en/messages.json': { size: 1000 },
          '_locales/de/messages.json': { size: 1120 },
          '_locales/hi/messages.json': { size: 1120 },
        },
      };

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: directory }
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const { errors } = addonLinter.collector;
      expect(errors).toEqual([]);
    });

    it('does not emit an error when files other than messages.json are present in language directory', () => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        default_locale: 'en',
      });
      const directory = {
        files: {
          '_locales/en/messages.json': { size: 1000 },
          '_locales/de/messages.json': { size: 1120 },
          '_locales/hi/messages.json': { size: 1120 },
          '_locales/en/styles.css': { size: 1000 },
          '_locales/de/styles.css': { size: 1120 },
          '_locales/hi/styles.css': { size: 1120 },
        },
      };

      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector,
        { io: directory }
      );
      expect(manifestJSONParser.isValid).toEqual(true);
      const { errors } = addonLinter.collector;
      expect(errors).toEqual([]);
    });
  });

  describe('homepage_url', () => {
    function testHomepageUrl(homepage_url, expectValid) {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        homepage_url,
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(expectValid);
      const { errors } = addonLinter.collector;
      if (expectValid) {
        expect(errors.length).toEqual(0);
      } else {
        expect(errors.length).toEqual(1);
        expect(errors[0].code).toEqual('RESTRICTED_HOMEPAGE_URL');
      }
    }

    // eslint-disable-next-line jest/expect-expect
    it.each([
      'https://addons.mozilla.org',
      'http://addons.mozilla.org/somepath',
    ])('should fail on forbidden homepage_url "%s"', (invalidUrl) => {
      return testHomepageUrl(invalidUrl, false);
    });

    // eslint-disable-next-line jest/expect-expect
    it('should not mark non forbidden homepage url as invalid', () => {
      return testHomepageUrl('http://test.org', true);
    });
  });

  describe('/developer/name', () => {
    it('overrides the author property', () => {
      const name = 'other in /developer/name';
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        developer: { name },
        author: 'some-author',
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.parsedJSON.author).toEqual(name);
    });
  });

  describe('/developer/url', () => {
    function testDeveloperUrl(url, expectValid) {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({ developer: { url } });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(expectValid);

      const { errors } = addonLinter.collector;
      if (expectValid) {
        expect(errors.length).toEqual(0);
      } else {
        expect(errors.length).toEqual(1);
        expect(errors[0].code).toEqual('RESTRICTED_HOMEPAGE_URL');
      }
    }

    // eslint-disable-next-line jest/expect-expect
    it.each([
      'https://addons.mozilla.org',
      'http://addons.mozilla.org/somepath',
    ])('should fail on forbidden developer URL "%s"', (invalidUrl) => {
      return testDeveloperUrl(invalidUrl, false);
    });

    // eslint-disable-next-line jest/expect-expect
    it('should not mark non forbidden developer URL as invalid', () => {
      return testDeveloperUrl('http://test.org', true);
    });

    it('overrides the homepage_url property', () => {
      const url = 'some url in /developer/url';
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        developer: { url },
        homepage_url: 'some homepage',
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );

      expect(manifestJSONParser.parsedJSON.homepage_url).toEqual(url);
    });
  });

  describe('@mdn/browser-compat-data: manifest properties', () => {
    const usesArrayValueForFirefoxDesktopCompat = {
      // There is a gap in the BCD data between two very old versions so we
      // ignore it.
      // Note: this might not be true for all props so we have to check the BCD
      // data in case a new prop breaks one of the test cases below. In case of
      // failure we want to double-check if we would need to special case the
      // new cases or just add them to the list of expected ones that follows.
      keys: [],
    };

    const usesArrayValueForFirefoxAndroidCompat = {
      keys: ['browser_specific_settings'],
      subKeys: {
        permissions: ['browsingData'],
      },
    };

    it('should provide the expected `browser_specific_settings` version', () => {
      const { firefox: firefoxSupport } =
        bcd.webextensions.manifest.browser_specific_settings.__compat.support;

      expect(firstStableVersion(firefoxSupport)).toEqual('42');
    });

    it.each(Object.keys(bcd.webextensions.manifest))(
      'returns the expected type for Firefox Desktop manifest prop: %s',
      (key) => {
        const prop = bcd.webextensions.manifest[key];
        const { support } = prop.__compat;

        if (usesArrayValueForFirefoxDesktopCompat.keys.includes(key)) {
          expect(Array.isArray(support.firefox)).toEqual(true);

          support.firefox.forEach((entry) => {
            expect(entry).toHaveProperty('version_added');
          });
        } else {
          expect(support.firefox).toHaveProperty('version_added');
        }

        // Also check sub-keys.
        Object.keys(prop)
          .filter((subKey) => subKey !== '__compat')
          .forEach((subKey) => {
            const { support: subSupport } = prop[subKey].__compat;

            expect(subSupport.firefox).toHaveProperty('version_added');
          });
      }
    );

    it.each(Object.keys(bcd.webextensions.manifest))(
      'returns the expected type for Firefox Android manifest prop: %s',
      (key) => {
        const prop = bcd.webextensions.manifest[key];
        const { support } = prop.__compat;

        if (usesArrayValueForFirefoxDesktopCompat.keys.includes(key)) {
          expect(Array.isArray(support.firefox)).toEqual(true);

          support.firefox.forEach((entry) => {
            expect(entry).toHaveProperty('version_added');
          });
        } else {
          expect(support.firefox).toHaveProperty('version_added');
        }

        // Also check sub-keys.
        Object.keys(prop)
          .filter((subKey) => subKey !== '__compat')
          .forEach((subKey) => {
            const { support: subSupport } = prop[subKey].__compat;

            if (
              usesArrayValueForFirefoxAndroidCompat.subKeys[key]?.includes(
                subKey
              )
            ) {
              expect(Array.isArray(subSupport.firefox_android)).toEqual(true);

              subSupport.firefox_android.forEach((entry) => {
                expect(entry).toHaveProperty('version_added');
              });
            } else {
              expect(subSupport.firefox_android).toHaveProperty(
                'version_added'
              );
            }
          });
      }
    );
  });

  describe('checkKeySupport', () => {
    // This set of test cases is needed to ensure that the `checkKeySupport()`
    // implementation can handle various data coming from
    // `@mdn/browser-compat-data`, which is a third-part library and the format
    // of the data may change over the time and it may require more changes to
    // the addons-linter implementation.
    const key = 'some-key';

    let addonLinter;
    let manifestJSONParser;

    beforeEach(() => {
      addonLinter = new Linter({ _: ['bar'] });
      manifestJSONParser = new ManifestJSONParser(
        validManifestJSON(),
        addonLinter.collector
      );
    });

    const _checkKeySupport = ({
      support,
      minFirefoxVersion,
      minAndroidVersion,
    }) => {
      const isPermission = true;

      manifestJSONParser.checkKeySupport(
        support,
        minFirefoxVersion,
        minAndroidVersion,
        key,
        isPermission
      );
    };

    it('supports array compat data for Android', () => {
      const support = {
        firefox_android: [
          { version_added: '56', version_removed: '79' },
          { version_added: '85' },
        ],
      };

      _checkKeySupport({
        support,
        minFirefoxVersion: 42,
        minAndroidVersion: 54,
      });

      expect(addonLinter.collector.notices).toHaveLength(1);
      expect(addonLinter.collector.notices[0]).toEqual(
        expect.objectContaining({
          description: oneLine`"strict_min_version" requires Firefox for
            Android 54, which was released before version 56 introduced
            support for "${key}".`,
        })
      );
    });

    it('supports array compat data with falsey version_added for Android', () => {
      const support = {
        firefox_android: [
          { version_added: true },
          { version_added: false },
          { version_added: '72', version_removed: '79' },
          { version_added: NaN },
          { version_added: '52', version_removed: '56' },
          { version_added: '85' },
          { version_added: null },
        ],
      };

      _checkKeySupport({
        support,
        minFirefoxVersion: 42,
        minAndroidVersion: 50,
      });

      expect(addonLinter.collector.notices).toHaveLength(1);
      expect(addonLinter.collector.notices[0]).toEqual(
        expect.objectContaining({
          description: oneLine`"strict_min_version" requires Firefox for
            Android 50, which was released before version 52 introduced
            support for "${key}".`,
        })
      );
    });

    it('supports an object compat data for Android', () => {
      const support = {
        firefox_android: {
          version_added: '114',
        },
      };

      _checkKeySupport({
        support,
        minFirefoxVersion: 42,
        minAndroidVersion: 113,
      });

      expect(addonLinter.collector.notices).toHaveLength(1);
      expect(addonLinter.collector.notices[0]).toEqual(
        expect.objectContaining({
          description: oneLine`"strict_min_version" requires Firefox for
            Android 113, which was released before version 114 introduced
            support for "${key}".`,
        })
      );
    });
  });

  describe('restricted permissions', () => {
    const validate = ({ manifestProps, restrictedPermissions }) => {
      const linter = new Linter({ _: ['bar'] });
      const parser = new ManifestJSONParser(
        validManifestJSON(manifestProps),
        linter.collector,
        { restrictedPermissions }
      );

      return { parser, linter };
    };

    it.each([
      [
        'no browser_specific_settings',
        {
          manifestProps: {
            permissions: ['alarms'],
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'no browser_specific_settings.gecko',
        {
          manifestProps: {
            browser_specific_settings: {},
            permissions: ['alarms'],
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'no strict_min_version',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {},
            },
            permissions: ['alarms'],
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'invalid strict_min_version (version below the strict min)',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '88.0',
              },
            },
            permissions: ['alarms'],
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'invalid strict_min_version (version below the strict min)',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '88.1.2',
              },
            },
            permissions: ['alarms'],
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'invalid strict_min_version (version below the strict min) with unrelated restrictions',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '88.1.2',
              },
            },
            permissions: ['alarms'],
          },
          restrictedPermissions: new Map([
            ['alarms', '88.1.3'],
            [('bookmarks', '100.0')],
          ]),
        },
      ],
      [
        'multiple permissions and version below the strict min',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '88.0',
              },
            },
            permissions: ['bookmarks', 'alarms'],
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'uppercase permission and version below the strict min',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '88.0',
              },
            },
            permissions: ['ALARMS'],
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'versions contain non-numeric chars',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '1.1pre1a',
              },
            },
            permissions: ['ALARMS'],
          },
          restrictedPermissions: new Map([['alarms', '1.1pre1aa']]),
        },
      ],
    ])(
      'reports an error when: %s',
      (title, { manifestProps, restrictedPermissions }) => {
        const { parser, linter } = validate({
          manifestProps,
          restrictedPermissions,
        });
        const { errors } = linter.collector;

        expect(parser.isValid).toEqual(false);
        expect(errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: messages.RESTRICTED_PERMISSION,
              file: 'manifest.json',
            }),
          ])
        );
      }
    );

    it.each([
      [
        'strict_min_version = min version required',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '88.1.3',
              },
            },
            permissions: ['alarms'],
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'strict_min_version > min version required',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '90.0',
              },
            },
            permissions: ['alarms'],
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'strict_min_version > min version required and uppercase permission',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '90.0',
              },
            },
            permissions: ['ALARMS'],
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'unrelated permission',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '88.0',
              },
            },
            permissions: ['bookmarks'],
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'empty permissions',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '88.0',
              },
            },
            permissions: [],
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'no permissions',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '88.0',
              },
            },
            permissions: undefined,
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'multiple permissions but strict_min_version > min version',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '89.0',
              },
            },
            permissions: ['bookmarks', 'alarms'],
          },
          restrictedPermissions: new Map([['alarms', '88.1.3']]),
        },
      ],
      [
        'no restricted permissions',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '87.0',
              },
            },
            permissions: ['bookmarks', 'alarms'],
          },
          restrictedPermissions: new Map([]),
        },
      ],
      [
        'versions contain non-numeric chars',
        {
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version: '1.1pre',
              },
            },
            permissions: ['alarms'],
          },
          restrictedPermissions: new Map([['alarms', '1.1c']]),
        },
      ],
    ])(
      'does not report an error when: %s',
      (title, { manifestProps, restrictedPermissions }) => {
        const { linter } = validate({
          manifestProps,
          restrictedPermissions,
        });
        const { errors } = linter.collector;

        // We cannot assert `parser.isValid` because some (unrelated) warnings
        // could set this prop to `false`.
        expect(errors).toEqual([]);
      }
    );

    const INVALID_COMPAT_VERSIONS = ['1', 'a', { notAString: true }];

    it.each(INVALID_COMPAT_VERSIONS)(
      'reports an error when the gecko.strict_min_version value is invalid (%s)',
      (strict_min_version) => {
        const { parser, linter } = validate({
          manifestProps: {
            browser_specific_settings: {
              gecko: {
                strict_min_version,
              },
            },
            permissions: ['alarms'],
          },
          restrictedPermissions: new Map([['alarms', '1.01']]),
        });
        const { errors } = linter.collector;

        expect(parser.isValid).toEqual(false);
        const errorOnInvalidStrictVersion =
          typeof strict_min_version === 'string'
            ? expect.objectContaining({ code: messages.JSON_INVALID.code })
            : expect.objectContaining({
                code: messages.MANIFEST_FIELD_INVALID.code,
              });

        expect(errors).toEqual(
          expect.arrayContaining([
            errorOnInvalidStrictVersion,
            expect.objectContaining({
              code: messages.RESTRICTED_PERMISSION,
              file: 'manifest.json',
            }),
          ])
        );
      }
    );

    it.each(INVALID_COMPAT_VERSIONS)(
      'reports an error when the gecko_android.strict_min_version value is invalid (%s)',
      (strict_min_version) => {
        const { parser, linter } = validate({
          manifestProps: {
            browser_specific_settings: {
              gecko_android: {
                strict_min_version,
              },
            },
          },
        });
        const { errors } = linter.collector;

        expect(parser.isValid).toEqual(false);
        const errorOnInvalidStrictVersion =
          typeof strict_min_version === 'string'
            ? expect.objectContaining({ code: messages.JSON_INVALID.code })
            : expect.objectContaining({
                code: messages.MANIFEST_FIELD_INVALID.code,
              });

        expect(errors).toEqual(
          expect.arrayContaining([errorOnInvalidStrictVersion])
        );
      }
    );

    it.each(INVALID_COMPAT_VERSIONS)(
      'reports an error when the gecko_android.strict_max_version value is invalid (%s)',
      (strict_max_version) => {
        const { parser, linter } = validate({
          manifestProps: {
            browser_specific_settings: {
              gecko_android: {
                strict_max_version,
              },
            },
          },
        });
        const { errors } = linter.collector;

        expect(parser.isValid).toEqual(false);
        const errorOnInvalidStrictVersion =
          typeof strict_max_version === 'string'
            ? expect.objectContaining({ code: messages.JSON_INVALID.code })
            : expect.objectContaining({
                code: messages.MANIFEST_FIELD_INVALID.code,
              });

        expect(errors).toEqual(
          expect.arrayContaining([errorOnInvalidStrictVersion])
        );
      }
    );

    it('adds specific information to the error message/description', () => {
      const { parser, linter } = validate({
        manifestProps: { permissions: ['alarms'] },
        restrictedPermissions: new Map([
          ['alarms', '78.1'],
          ['bookmarks', '123.4'],
        ]),
      });
      const { errors } = linter.collector;

      expect(parser.isValid).toEqual(false);
      expect(errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: messages.RESTRICTED_PERMISSION,
            message: oneLine`The "alarms" permission
              requires "strict_min_version" to be set to "78.1" or above`,
            description: oneLine`The "alarms" permission
              requires "strict_min_version" to be set to "78.1" or above. Please
              update your manifest.json version to specify a minimum Firefox
              version.`,
          }),
        ])
      );
    });

    describe('proxy', () => {
      it('requires a strict_min_version value for the proxy permission', () => {
        const { parser, linter } = validate({
          manifestProps: { permissions: ['PROXY'] },
        });
        const { errors } = linter.collector;

        expect(parser.isValid).toEqual(false);
        expect(errors).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              code: messages.RESTRICTED_PERMISSION,
              file: 'manifest.json',
            }),
          ])
        );
      });

      it.each(['91.0', '91.0.1', '90.1'])(
        'reports an error when strict_min_version is set to %s for the proxy permission',
        (strict_min_version) => {
          const { parser, linter } = validate({
            manifestProps: {
              browser_specific_settings: { gecko: { strict_min_version } },
              permissions: ['Proxy'],
            },
          });
          const { errors } = linter.collector;

          expect(parser.isValid).toEqual(false);
          expect(errors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                code: messages.RESTRICTED_PERMISSION,
                file: 'manifest.json',
              }),
            ])
          );
        }
      );

      it.each(['91.1.0', '91.1', '91.2', '92.0'])(
        'accepts a strict_min_version set to %s for the proxy permission',
        (strict_min_version) => {
          const { linter } = validate({
            manifestProps: {
              browser_specific_settings: { gecko: { strict_min_version } },
              permissions: ['proxy'],
            },
          });
          const { errors } = linter.collector;

          expect(errors).toEqual([]);
        }
      );
    });
  });

  describe('install_origins', () => {
    it.each([
      {
        origins: ['https://example.com/testing'],
        expectedError: 'MANIFEST_INSTALL_ORIGINS',
      }, // Extra path
      { origins: ['file:/foo/bar'], expectedError: 'MANIFEST_INSTALL_ORIGINS' }, // Disallowed scheme
      { origins: [' '], expectedError: 'MANIFEST_INSTALL_ORIGINS' },
      {
        origins: ['https://foo.bar.栃木.jp/'],
        expectedError: 'MANIFEST_INSTALL_ORIGINS',
      }, // Trailing slash
      { origins: [''], expectedError: 'MANIFEST_INSTALL_ORIGINS' },
      { origins: [[]], expectedError: 'MANIFEST_INSTALL_ORIGINS' },
      { origins: [{}], expectedError: 'MANIFEST_INSTALL_ORIGINS' },
      {
        origins: ['https://*.example.com'],
        expectedError: 'MANIFEST_INSTALL_ORIGINS',
      }, // Wildcard
      { origins: ['example.com'], expectedError: 'MANIFEST_INSTALL_ORIGINS' }, // No scheme
      { origins: ['https://'], expectedError: 'MANIFEST_INSTALL_ORIGINS' }, // No hostname
      {
        origins: ['https://foo.com', 'https://bar.com/path'],
        expectedError: 'MANIFEST_INSTALL_ORIGINS',
      }, // One valid, one invalid
      {
        origins: ['https://foo.com', null],
        expectedError: 'MANIFEST_INSTALL_ORIGINS',
      }, // One valid, one invalid
    ])(
      'should disallow invalid install origins content "$origins"',
      ({ origins, expectedError }) => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          install_origins: origins,
          browser_specific_settings: {
            gecko: {
              id: 'foo@bar',
            },
          },
        });
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );
        expect(manifestJSONParser.isValid).toEqual(false);
        expect(addonLinter.collector.errors.length).toEqual(1);
        expect(addonLinter.collector.errors[0].code).toEqual(expectedError);
        expect(addonLinter.collector.errors[0].message).toMatch(
          /\/install_origins: Invalid install_origins ".*" at \d+/
        );
      }
    );

    it.each([
      { origins: {}, expectedError: 'MANIFEST_FIELD_INVALID' },
      { origins: null, expectedError: 'MANIFEST_FIELD_INVALID' },
      { origins: 42, expectedError: 'MANIFEST_FIELD_INVALID' },
      { origins: '', expectedError: 'MANIFEST_FIELD_INVALID' },
      {
        origins: new Array(6).fill('https://example.com'),
        expectedError: 'JSON_INVALID',
      }, // Too large
    ])(
      'should disallow invalid install origins "$origins"',
      ({ origins, expectedError }) => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({
          install_origins: origins,
          browser_specific_settings: {
            gecko: {
              id: 'foo@bar',
            },
          },
        });
        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );
        expect(manifestJSONParser.isValid).toEqual(false);
        expect(addonLinter.collector.errors.length).toEqual(1);
        expect(addonLinter.collector.errors[0].code).toEqual(expectedError);
      }
    );

    it.each([
      { origins: ['https://example.com'] },
      { origins: ['https://foo.example.com'] },
      { origins: ['https://xn--fo-9ja.com'] }, // IDNs are accepted in punycode (ascii)...
      { origins: ['https://foo.bar.栃木.jp'] }, // ... or unicode.
      { origins: ['https://example.com:8888'] },
      { origins: ['https://foo.example.com', 'https://foo.bar.栃木.jp:9999'] },
      { origins: [] }, // Empty array is valid
    ])('should allow valid install origins "$origins"', ({ origins }) => {
      const addonLinter = new Linter({ _: ['bar'] });
      const json = validManifestJSON({
        install_origins: origins,
        browser_specific_settings: {
          gecko: {
            id: 'foo@bar',
          },
        },
      });
      const manifestJSONParser = new ManifestJSONParser(
        json,
        addonLinter.collector
      );
      expect(manifestJSONParser.isValid).toEqual(true);
    });
  });

  describe('experimentApiPaths', () => {
    const makeFakeAPI = (props) => {
      return {
        fakeApi: {
          schema: 'path/to/schema.json',
          ...props,
        },
      };
    };

    it.each([
      { title: 'undefined apis', experiment_apis: undefined, expected: [] },
      { title: 'no apis', experiment_apis: null, expected: [] },
      { title: 'empty apis', experiment_apis: {}, expected: [] },
      {
        // This should not be possible in real life but we lint code that isn't
        // necessarily "production-ready".
        title: 'api with parent but empty list of paths',
        experiment_apis: makeFakeAPI({
          parent: {
            paths: [],
          },
        }),
        expected: [],
      },
      {
        // This should not be possible in real life but we lint code that isn't
        // necessarily "production-ready".
        title: 'api with parent but invalid value in list of paths',
        experiment_apis: makeFakeAPI({
          parent: {
            paths: ['not-an-array'],
          },
        }),
        expected: [],
      },
      {
        // This should not be possible in real life but we lint code that isn't
        // necessarily "production-ready".
        title: 'api with parent but empty array in list of paths',
        experiment_apis: makeFakeAPI({
          parent: {
            paths: [[]],
          },
        }),
        expected: [],
      },
      {
        title: 'api with parent',
        experiment_apis: makeFakeAPI({
          parent: {
            paths: [['foo']],
          },
        }),
        expected: ['foo'],
      },
      {
        title: 'api with parent and two paths',
        experiment_apis: makeFakeAPI({
          parent: {
            paths: [['foo'], ['another', 'api', 'namespace']],
          },
        }),
        expected: ['foo', 'another.api.namespace'],
      },
      {
        // This should not be possible in real life but we lint code that isn't
        // necessarily "production-ready".
        title: 'api with child but empty list of paths',
        experiment_apis: makeFakeAPI({
          child: {
            paths: [],
          },
        }),
        expected: [],
      },
      {
        // This should not be possible in real life but we lint code that isn't
        // necessarily "production-ready".
        title: 'api with child but empty array in list of paths',
        experiment_apis: makeFakeAPI({
          child: {
            paths: [[]],
          },
        }),
        expected: [],
      },
      {
        title: 'api with child',
        experiment_apis: makeFakeAPI({
          child: {
            paths: [['foo']],
          },
        }),
        expected: ['foo'],
      },
      {
        title: 'api with child and two paths',
        experiment_apis: makeFakeAPI({
          child: {
            paths: [['foo'], ['another', 'api', 'namespace']],
          },
        }),
        expected: ['foo', 'another.api.namespace'],
      },
      {
        title: 'api with parent and child',
        experiment_apis: makeFakeAPI({
          child: {
            paths: [['i', 'am', 'the', 'child']],
          },
          parent: {
            paths: [['i', 'am', 'the', 'parent']],
          },
        }),
        expected: ['i.am.the.parent', 'i.am.the.child'],
      },
      {
        title: 'api with parent and child and same path',
        experiment_apis: makeFakeAPI({
          child: {
            paths: [['i', 'am', 'the', 'api']],
          },
          parent: {
            paths: [['i', 'am', 'the', 'api']],
          },
        }),
        expected: ['i.am.the.api'],
      },
    ])(
      'exposes a list of experiment API paths: $title',
      ({ experiment_apis, expected }) => {
        const addonLinter = new Linter({ _: ['bar'] });
        const json = validManifestJSON({ experiment_apis });

        const manifestJSONParser = new ManifestJSONParser(
          json,
          addonLinter.collector
        );

        const { experimentApiPaths } = manifestJSONParser.getMetadata();
        expect(Array.from(experimentApiPaths)).toEqual(expected);
      }
    );
  });

  describe('applications property - MV2', () => {
    it('does not emit any warning or error when a MV2 extension does not use applications or browser_specific_settings', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
        }),
        linter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(linter.collector.errors).toEqual([]);
      expect(linter.collector.warnings).toEqual([]);
    });

    it('does not emit a warning when a MV2 extension uses browser_specific_settings', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {},
        }),
        linter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(linter.collector.errors).toEqual([]);
      expect(linter.collector.warnings).toEqual([]);
    });

    it('emits a warning when a MV2 extension uses applications', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          applications: {},
        }),
        linter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(linter.collector.errors).toEqual([]);

      expect(linter.collector.warnings.length).toEqual(1);
      assertHasMatchingError(linter.collector.warnings, {
        code: messages.APPLICATIONS_DEPRECATED.code,
      });
    });

    it('only emits a single warning when a MV2 extension uses both applications and browser_specific_settings.gecko', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          applications: {},
          browser_specific_settings: {
            gecko: {},
          },
        }),
        linter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(linter.collector.errors).toEqual([]);

      expect(linter.collector.warnings.length).toEqual(1);
      // Since the `applications` property is already reported as ignored, we
      // don't warn about the deprecation of it.
      assertHasMatchingError(linter.collector.warnings, {
        code: messages.IGNORED_APPLICATIONS_PROPERTY.code,
      });
    });

    it('emits a deprecation warning when a MV2 extension uses applications and an empty browser_specific_settings', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          applications: {},
          browser_specific_settings: {},
        }),
        linter.collector
      );

      expect(linter.collector.warnings.length).toEqual(1);
      assertHasMatchingError(linter.collector.warnings, {
        code: messages.APPLICATIONS_DEPRECATED.code,
      });
      expect(linter.collector.errors).toEqual([]);
      expect(manifestJSONParser.isValid).toEqual(true);
    });
  });

  describe('applications property - MV3', () => {
    it('does not emit any warning or error when a MV3 extension uses browser_specific_settings', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 3,
          name: 'some name',
          version: '1',
          browser_specific_settings: { gecko: { id: 'some@id' } },
        }),
        linter.collector,
        { schemaValidatorOptions: { maxManifestVersion: 3 } }
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(linter.collector.errors).toEqual([]);
      expect(linter.collector.warnings).toEqual([]);
    });

    it('emits an error when a MV3 extension uses applications', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 3,
          name: 'some name',
          version: '1',
          applications: {},
        }),
        linter.collector,
        { schemaValidatorOptions: { maxManifestVersion: 3 } }
      );

      expect(manifestJSONParser.isValid).toEqual(false);
      expect(linter.collector.warnings).toEqual([]);

      assertHasMatchingError(linter.collector.errors, {
        code: messages.APPLICATIONS_INVALID.code,
      });
    });

    it('emits an error when a MV3 extension uses both applications and browser_specific_settings', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 3,
          name: 'some name',
          version: '1',
          applications: {},
          browser_specific_settings: {},
        }),
        linter.collector,
        { schemaValidatorOptions: { maxManifestVersion: 3 } }
      );

      expect(manifestJSONParser.isValid).toEqual(false);
      expect(linter.collector.warnings).toEqual([]);

      assertHasMatchingError(linter.collector.errors, {
        code: messages.APPLICATIONS_INVALID.code,
      });
    });
  });

  describe('incognito', () => {
    it('emits a warning when incognito:split is used', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          incognito: 'split',
        }),
        linter.collector
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(linter.collector.errors).toEqual([]);
      expect(linter.collector.warnings).toEqual([
        expect.objectContaining(messages.INCOGNITO_SPLIT_UNSUPPORTED),
      ]);
    });
  });

  describe('admin_install_only', () => {
    it.each([
      {
        manifest_version: 2,
        applications: { gecko: { id: '@test-id', admin_install_only: true } },
      },
      {
        manifest_version: 2,
        applications: { gecko: { id: '@test-id', admin_install_only: false } },
      },
      {
        manifest_version: 2,
        browser_specific_settings: {
          gecko: { id: '@test-id', admin_install_only: true },
        },
      },
      {
        manifest_version: 2,
        browser_specific_settings: {
          gecko: { id: '@test-id', admin_install_only: false },
        },
      },
      {
        manifest_version: 2,
        browser_specific_settings: {
          gecko: { id: '@test-id', admin_install_only: false },
          gecko_android: { strict_min_version: '123.0' },
        },
      },
      {
        manifest_version: 3,
        browser_specific_settings: {
          gecko: { id: '@test-id', admin_install_only: true },
        },
      },
      {
        manifest_version: 3,
        browser_specific_settings: {
          gecko: { id: '@test-id', admin_install_only: false },
        },
      },
      {
        manifest_version: 3,
        browser_specific_settings: {
          gecko: { id: '@test-id', admin_install_only: false },
          gecko_android: { strict_min_version: '123.0' },
        },
      },
    ])(
      'emits an error when the admin_install_only flag is present - %o',
      (manifestProps) => {
        const linter = new Linter({ _: ['bar'] });

        const manifestJSONParser = new ManifestJSONParser(
          JSON.stringify({
            name: 'some name',
            version: '1',
            ...manifestProps,
          }),
          linter.collector
        );

        expect(manifestJSONParser.isValid).toEqual(false);
        if (manifestProps.applications) {
          expect(linter.collector.warnings).toEqual([
            expect.objectContaining(messages.APPLICATIONS_DEPRECATED),
          ]);
        } else {
          expect(linter.collector.warnings).toEqual([]);
        }
        expect(linter.collector.errors).toEqual([
          expect.objectContaining(messages.ADMIN_INSTALL_ONLY_PROP_RESERVED),
        ]);
      }
    );

    it('emits an error when the enterprise option is false', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: { id: '@test-id', admin_install_only: true },
          },
        }),
        linter.collector,
        { isEnterprise: false }
      );

      expect(manifestJSONParser.isValid).toEqual(false);
      expect(linter.collector.warnings).toEqual([]);
      expect(linter.collector.errors).toEqual([
        expect.objectContaining(messages.ADMIN_INSTALL_ONLY_PROP_RESERVED),
      ]);
    });

    it('does not emit an error when the enterprise option is passed', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: { id: '@test-id', admin_install_only: true },
          },
        }),
        linter.collector,
        { isEnterprise: true }
      );

      expect(manifestJSONParser.isValid).toEqual(true);
      expect(linter.collector.warnings).toEqual([]);
      expect(linter.collector.errors).toEqual([]);
    });

    it('emits an error when the enterprise option is passed but the value is false', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: { id: '@test-id', admin_install_only: false },
          },
        }),
        linter.collector,
        { isEnterprise: true }
      );

      expect(manifestJSONParser.isValid).toEqual(false);
      expect(linter.collector.warnings).toEqual([]);
      expect(linter.collector.errors).toEqual([
        expect.objectContaining(messages.ADMIN_INSTALL_ONLY_REQUIRED),
      ]);
    });

    it('emits an error when the enterprise option is passed and the flag is set in applications', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          applications: {
            gecko: { id: '@test-id', admin_install_only: true },
          },
        }),
        linter.collector,
        { isEnterprise: true }
      );

      expect(manifestJSONParser.isValid).toEqual(false);
      expect(linter.collector.warnings).toEqual([
        expect.objectContaining(messages.APPLICATIONS_DEPRECATED),
      ]);
      expect(linter.collector.errors).toEqual([
        expect.objectContaining(messages.ADMIN_INSTALL_ONLY_REQUIRED),
      ]);
    });

    it('emits an error when the enterprise option is passed, the flag is set in applications, and bss is defined', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: { id: '@test-id' },
          },
          applications: {
            gecko: { admin_install_only: true },
          },
        }),
        linter.collector,
        { isEnterprise: true }
      );

      expect(manifestJSONParser.isValid).toEqual(false);
      expect(linter.collector.warnings).toEqual([
        expect.objectContaining(messages.IGNORED_APPLICATIONS_PROPERTY),
      ]);
      expect(linter.collector.errors).toEqual([
        expect.objectContaining(messages.ADMIN_INSTALL_ONLY_REQUIRED),
      ]);
    });

    it.each([true, false])(
      'sets selfHosted to true when isEnterprise is true, even if selfHosted is %s',
      (selfHosted) => {
        const linter = new Linter({ _: ['bar'] });

        const manifestJSONParser = new ManifestJSONParser(
          JSON.stringify({
            manifest_version: 3,
            name: 'some name',
            version: '1',
            browser_specific_settings: {
              gecko: { admin_install_only: true },
            },
          }),
          linter.collector,
          { isEnterprise: true, selfHosted }
        );

        expect(manifestJSONParser.selfHosted).toEqual(true);
      }
    );
  });

  describe('data_collection_permissions', () => {
    it('emits an error when data_collection_permissions is specified and the support is disabled', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: { data_collection_permissions: { required: ['none'] } },
          },
        }),
        linter.collector,
        { schemaValidatorOptions: { enableDataCollectionPermissions: false } }
      );

      expect(linter.collector.errors).toEqual([
        expect.objectContaining(
          messages.DATA_COLLECTION_PERMISSIONS_PROP_RESERVED
        ),
      ]);

      expect(linter.collector.notices).toEqual([]);
      expect(manifestJSONParser.isValid).toEqual(false);
    });

    it('does not emit an error when data_collection_permissions is specified and the support is enabled', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: { data_collection_permissions: { required: ['none'] } },
          },
        }),
        linter.collector,
        { schemaValidatorOptions: { enableDataCollectionPermissions: true } }
      );

      expect(linter.collector.errors).toEqual([]);
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('validates data collection permissions - invalid prop value', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: { data_collection_permissions: true },
          },
        }),
        linter.collector,
        { schemaValidatorOptions: { enableDataCollectionPermissions: true } }
      );

      expect(linter.collector.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'MANIFEST_FIELD_INVALID' }),
        ])
      );
      expect(manifestJSONParser.isValid).toEqual(false);
    });

    it('validates data collection permissions - unknown required perm', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: {
              data_collection_permissions: {
                required: ['invalid_perm'],
              },
            },
          },
        }),
        linter.collector,
        { schemaValidatorOptions: { enableDataCollectionPermissions: true } }
      );

      assertHasMatchingError(linter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message:
          /"\/browser_specific_settings\/gecko\/data_collection_permissions\/required\/0" must be equal to one of the allowed values/,
      });
      expect(manifestJSONParser.isValid).toEqual(false);
    });

    it('validates data collection permissions - unknown optional perm', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: {
              data_collection_permissions: {
                optional: ['invalid_perm'],
              },
            },
          },
        }),
        linter.collector,
        { schemaValidatorOptions: { enableDataCollectionPermissions: true } }
      );

      assertHasMatchingError(linter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message:
          /"\/browser_specific_settings\/gecko\/data_collection_permissions\/optional\/0" must be equal to one of the allowed values/,
      });
      expect(manifestJSONParser.isValid).toEqual(false);
    });

    it('emits a notice when data_collection_permissions is not specified and the support is enabled', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
        }),
        linter.collector,
        { schemaValidatorOptions: { enableDataCollectionPermissions: true } }
      );

      expect(linter.collector.errors).toEqual([]);
      expect(linter.collector.notices).toEqual([
        expect.objectContaining(messages.MISSING_DATA_COLLECTION_PERMISSIONS),
      ]);
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('emits an error when "none" is specified with other data collection permissions', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: {
              data_collection_permissions: {
                required: ['none', 'healthInfo'],
              },
            },
          },
        }),
        linter.collector,
        { schemaValidatorOptions: { enableDataCollectionPermissions: true } }
      );

      expect(linter.collector.errors).toEqual([
        expect.objectContaining(messages.NONE_DATA_COLLECTION_IS_EXCLUSIVE),
      ]);
      expect(manifestJSONParser.isValid).toEqual(false);
    });

    it('emits an error when the list of required permissions is empty', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: {
              data_collection_permissions: {
                required: [],
              },
            },
          },
        }),
        linter.collector,
        { schemaValidatorOptions: { enableDataCollectionPermissions: true } }
      );

      assertHasMatchingError(linter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message:
          '"/browser_specific_settings/gecko/data_collection_permissions/required" must NOT have fewer than 1 items',
      });
      expect(manifestJSONParser.isValid).toEqual(false);
    });

    it('emits an error when the list of required permissions is missing', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: {
              data_collection_permissions: {},
            },
          },
        }),
        linter.collector,
        { schemaValidatorOptions: { enableDataCollectionPermissions: true } }
      );

      assertHasMatchingError(linter.collector.errors, {
        code: messages.MANIFEST_FIELD_REQUIRED.code,
        message:
          '"/browser_specific_settings/gecko/data_collection_permissions" must have required property \'required\'',
      });
      expect(manifestJSONParser.isValid).toEqual(false);
    });

    it('does not emit an error on valid required and optional data collection permissions', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: {
              data_collection_permissions: {
                required: ['none'],
                optional: ['technicalAndInteraction', 'locationInfo'],
              },
            },
          },
        }),
        linter.collector,
        { schemaValidatorOptions: { enableDataCollectionPermissions: true } }
      );

      expect(linter.collector.errors).toEqual([]);
      expect(manifestJSONParser.isValid).toEqual(true);
    });

    it('emits an error when technicalAndInteraction is used in the required list', () => {
      const linter = new Linter({ _: ['bar'] });

      const manifestJSONParser = new ManifestJSONParser(
        JSON.stringify({
          manifest_version: 2,
          name: 'some name',
          version: '1',
          browser_specific_settings: {
            gecko: {
              data_collection_permissions: {
                required: ['technicalAndInteraction', 'locationInfo'],
              },
            },
          },
        }),
        linter.collector,
        { schemaValidatorOptions: { enableDataCollectionPermissions: true } }
      );

      assertHasMatchingError(linter.collector.errors, {
        code: messages.JSON_INVALID.code,
        message:
          '"/browser_specific_settings/gecko/data_collection_permissions/required/0" must be equal to one of the allowed values',
      });
      expect(manifestJSONParser.isValid).toEqual(false);
    });
  });
});
