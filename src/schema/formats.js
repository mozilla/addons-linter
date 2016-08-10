import parse from 'url-parse';

const VALIDNUMRX = /^[0-9]{1,5}$/;

// Firefox's version format is laxer than Chrome's, it accepts:
// https://developer.mozilla.org/en-US/docs/Toolkit_version_format
// We choose a slightly restricted version of that format (but still more
// permissive than Chrome) to allow Beta addons, per:
// https://developer.mozilla.org/en-US/Add-ons/AMO/Policy/Maintenance
const TOOLKIT_VERSION_REGEX = /^(\d+\.?){1,3}\.(\d+([A-z]+(\-?[\dA-z]+)?))$/;

export function isToolkitVersionString(version) {
  return TOOLKIT_VERSION_REGEX.test(version) && isValidVersionString(version);
}

export function isValidVersionString(version) {
  // We should be starting with a string.
  if (typeof version !== 'string') {
    return false;
  }
  // If valid toolkit version string, return true early
  if (TOOLKIT_VERSION_REGEX.test(version)) {
    return true;
  }
  var parts = version.split('.');
  if (parts.length > 4) {
    return false;
  }
  for (var part of parts) {
    // Leading or multiple zeros not allowed.
    if (part.startsWith('0') && part.length > 1) {
      return false;
    }
    // Disallow things like 123e5 which parseInt will convert.
    if (!VALIDNUMRX.test(part)) {
      return false;
    }
    part = parseInt(part, 10);
    if (Number.isNaN(part) || part < 0 || part > 65535) {
      return false;
    }
  }
  return true;
}

export function isRelativeURL(url) {
  let parsed = parse(url);

  if (parsed.protocol !== '' || parsed.href.startsWith('//')) {
    return false;
  }

  return true;
}
