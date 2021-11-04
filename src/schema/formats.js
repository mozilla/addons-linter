const VALIDNUMRX = /^[0-9]{1,5}$/;

// Firefox's version format is laxer than Chrome's, it accepts:
// https://developer.mozilla.org/en-US/docs/Toolkit_version_format
// We choose a slightly restricted version of that format (but still more
// permissive than Chrome) to allow Beta addons, per:
// https://developer.mozilla.org/en-US/Add-ons/AMO/Policy/Maintenance
const TOOLKIT_VERSION_REGEX = /^(\d+\.?){1,3}\.(\d+([A-z]+(-?\d+)?))$/;
// 1.2.3buildid5.6 is used in practice but not matched by TOOLKIT_VERSION_REGEX.
// Use this pattern to accept the used format without being too permissive.
// See https://github.com/mozilla/addons-linter/issues/3998
const TOOLKIT_WITH_BUILDID_REGEX = /^\d+(?:\.\d+){0,2}buildid\d{8}\.\d{6}$/;

export function isToolkitVersionString(version) {
  // We should be starting with a string. Limit length, see bug 1393644
  if (typeof version !== 'string' || version.length > 100) {
    return false;
  }
  return (
    TOOLKIT_VERSION_REGEX.test(version) ||
    TOOLKIT_WITH_BUILDID_REGEX.test(version)
  );
}

export function isValidVersionString(version) {
  // If valid toolkit version string, return true early
  if (isToolkitVersionString(version)) {
    return true;
  }
  // We should be starting with a string. Limit length, see bug 1393644
  if (typeof version !== 'string' || version.length > 100) {
    return false;
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

export function isOrigin(value) {
  // FIXME: should we only have isSecureOrigin ?
  let url;
  try {
    url = new URL(value);
  } catch (e) {
    // It's invalid or not absolute.
    return false;
  }
  if (value.includes('*')) {
    // Wildcards are not valid in origins.
    return false;
  }
  if (
    url.pathname !== '/' ||
    url.hash !== '' ||
    url.search !== '' ||
    value.endsWith('/')
  ) {
    // Path, query string and hash shouldn't be included in origins.
    // URL().pathname will always be '/' if no path is provided, so we have to
    // check value doesn't end with one either.
    return false;
  }
  // value === url.origin would be enough if it wasn't for IDNs but
  //  URL().origin returns punycode, so we have to compare against URL().href
  // minus the last character instead, having checked that there was no path,
  // query string or hash earlier.
  return url.href.slice(0, -1) === url.origin;
}

export function imageDataOrStrictRelativeUrl(value) {
  // Do not accept a string which resolves as an absolute URL, or any
  // protocol-relative URL, except PNG or JPG data URLs.
  return (
    value.startsWith('data:image/png;base64,') ||
    value.startsWith('data:image/jpeg;base64,') ||
    isStrictRelativeUrl(value)
  );
}

export const isUnresolvedRelativeUrl = isStrictRelativeUrl;

export function manifestShortcutKey(value) {
  // Partially taken from Firefox directly via
  // https://searchfox.org/mozilla-central/source/toolkit/components/extensions/Schemas.jsm#987
  // Please make sure to always update this function when doing a schema update
  // to pull in the most recent implementation to stay up-to-date with upstream.

  const MEDIA_KEYS =
    /^(MediaNextTrack|MediaPlayPause|MediaPrevTrack|MediaStop)$/;
  const BASIC_KEYS =
    /^([A-Z0-9]|Comma|Period|Home|End|PageUp|PageDown|Space|Insert|Delete|Up|Down|Left|Right)$/;
  const FUNCTION_KEYS = /^(F[1-9]|F1[0-2])$/;

  if (MEDIA_KEYS.test(value.trim())) {
    return true;
  }

  const modifiers = value.split('+').map((s) => s.trim());
  const key = modifiers.pop();

  if (!BASIC_KEYS.test(key) && !FUNCTION_KEYS.test(key)) {
    return false;
  }

  const chromeModifierKeyMap = {
    Alt: 'alt',
    Command: 'accel',
    Ctrl: 'accel',
    MacCtrl: 'control',
    Shift: 'shift',
  };

  const chromeModifiers = modifiers.map((m) => chromeModifierKeyMap[m]);

  // If the modifier wasn't found it will be undefined.
  if (chromeModifiers.some((modifier) => !modifier)) {
    return false;
  }

  switch (modifiers.length) {
    case 0:
      // A lack of modifiers is only allowed with function keys.
      if (!FUNCTION_KEYS.test(key)) {
        return false;
      }
      break;
    case 1:
      // Shift is only allowed on its own with function keys.
      if (chromeModifiers[0] === 'shift' && !FUNCTION_KEYS.test(key)) {
        return false;
      }
      break;
    case 2:
      if (chromeModifiers[0] === chromeModifiers[1]) {
        return false;
      }
      break;
    default:
      return false;
  }

  return true;
}
