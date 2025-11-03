export function isAbsoluteUrl(value) {
  try {
    // eslint-disable-next-line no-new
    new URL(value);
  } catch {
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
  } catch {
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
  } catch {
    // It's invalid or not absolute.
    return false;
  }
  // URL is absolute, check against secure protocols.
  return ['https:', 'wss:'].includes(url.protocol);
}

export function isOrigin(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (!/^https?:/.test(url.protocol)) {
    return false;
  }
  if (value.includes('*')) {
    return false;
  }
  // url.origin is punycode so a direct check against string won't work.
  // url.href appends a slash even if not in the original string, so we
  // additionally check that the value does not end with slash.
  if (value.endsWith('/') || url.href !== new URL(url.origin).href) {
    return false;
  }
  return true;
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
