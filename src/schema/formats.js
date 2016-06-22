const VALIDNUMRX = /^[0-9]{1,5}$/;
const RELATIVE_URL_REGEX = /^(?!(.+|)\/)/;


export function isValidVersionString(version) {
  // We should be starting with a string.
  if (typeof version !== 'string') {
    return false;
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
  return Boolean(url.match(RELATIVE_URL_REGEX));
}
