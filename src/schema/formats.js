import { URL } from 'whatwg-url';

const VALIDNUMRX = /^[0-9]{1,5}$/;

// Firefox's version format is laxer than Chrome's, it accepts:
// https://developer.mozilla.org/en-US/docs/Toolkit_version_format
// We choose a slightly restricted version of that format (but still more
// permissive than Chrome) to allow Beta addons, per:
// https://developer.mozilla.org/en-US/Add-ons/AMO/Policy/Maintenance
const TOOLKIT_VERSION_REGEX = /^(\d+\.?){1,3}\.(\d+([A-z]+(-?[\dA-z]+)?))$/;

export function isValidVersionString(version) {
  // We should be starting with a string.
  if (typeof version !== 'string') {
    return false;
  }
  // If valid toolkit version string, return true early
  if (TOOLKIT_VERSION_REGEX.test(version)) {
    return true;
  }
  const parts = version.split('.');
  if (parts.length > 4) {
    return false;
  }

  for (let i = 0; i < parts.length; i++) {
    let part = parts[i];
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

export function isToolkitVersionString(version) {
  return TOOLKIT_VERSION_REGEX.test(version) && isValidVersionString(version);
}

export function isAbsoluteUrl(value) {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
  } catch (e) {
    // Couldn't parse, invalid.
    return false;
  }
  // Could parse without a base, it's absolute.
  return true;
}

function isRelativeUrl(value) {
  // A dummy protocol that shouldn't exist.
  const protocol = 'asdoiasjdpoaisjd:';
  let url;
  try {
    url = new URL(value, `${protocol}//foo`);
  } catch (e) {
    // URL is invalid.
    return false;
  }

  // If the URL is relative, then the protocol will stay the same, but host
  // could change due to protocol relative. Also check that the URL isn't
  // absolute, since then it is using the dummy protocol we defined.
  return url.protocol === protocol && !isAbsoluteUrl(value);
}

export function isAnyUrl(value) {
  return isAbsoluteUrl(value) || isRelativeUrl(value);
}

export function isStrictRelativeUrl(value) {
  return !value.startsWith('//') && isRelativeUrl(value);
}

export function isSecureUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch (e) {
    // It's invalid or not absolute.
    return false;
  }
  // URL is absolute, check against secure protocols.
  return ['https:', 'wss:'].includes(url.protocol);
}
