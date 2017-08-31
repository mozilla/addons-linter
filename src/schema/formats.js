import { URL } from 'whatwg-url';

// Firefox's version format is laxer than Chrome's, it accepts:
// https://developer.mozilla.org/en-US/docs/Toolkit_version_format
// We choose a slightly restricted version of that format (but still more
// permissive than Chrome) to allow Beta addons, per:
// https://developer.mozilla.org/en-US/Add-ons/AMO/Policy/Maintenance
const VERSION_PART =
  '(?:0|[1-9]\\d{0,3}|[1-5]\\d{4}|6(?:[0-4]\\d{3}|5(?:[0-4]\\d{2}|5(?:[0-2]\\d|3[0-5]))))';
const BETA_PART = '(?:a(?:lpha)?|b(?:eta)?|pre|rc)\\d*';
const VERSION_REGEXP =
  new RegExp(`^${VERSION_PART}(?:\\.${VERSION_PART}){0,3}(?:${BETA_PART})?$`);

export function isValidVersionString(version) {
  // We should be starting with a string.
  if (typeof version !== 'string') {
    return false;
  }
  return VERSION_REGEXP.test(version);
}

export function isToolkitVersionString(version) {
  return isValidVersionString(version);
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
