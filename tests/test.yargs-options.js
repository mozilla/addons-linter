import { getDefaultConfigValue } from 'yargs-options';

describe('getDefaultConfigValue()', () => {
  it('should return the default value', () => {
    expect(getDefaultConfigValue('log-level')).toEqual('fatal');
    expect(getDefaultConfigValue('warnings-as-errors')).toEqual(false);
    expect(getDefaultConfigValue('output')).toEqual('text');
    expect(getDefaultConfigValue('metadata')).toEqual(false);
    expect(getDefaultConfigValue('pretty')).toEqual(false);
    expect(getDefaultConfigValue('stack')).toEqual(false);
    expect(getDefaultConfigValue('boring')).toEqual(false);
    expect(getDefaultConfigValue('privileged')).toEqual(false);
    expect(getDefaultConfigValue('self-hosted')).toEqual(false);
    expect(getDefaultConfigValue('enable-background-service-worker')).toEqual(
      false
    );
    expect(getDefaultConfigValue('min-manifest-version')).toEqual(2);
    expect(getDefaultConfigValue('max-manifest-version')).toEqual(3);
    expect(getDefaultConfigValue('disable-xpi-autoclose')).toEqual(false);
    expect(getDefaultConfigValue('enable-data-collection-permissions')).toEqual(
      true
    );
  });

  it('should return undefined', () => {
    expect(getDefaultConfigValue('disable-linter-rules')).toBeUndefined();
  });

  it('should return undefined for unknown option', () => {
    expect(getDefaultConfigValue('unknown')).toBeUndefined();
  });
});
