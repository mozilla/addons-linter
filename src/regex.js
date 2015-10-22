// Details on the chrome protocol are here: https://goo.gl/W52T0Q
// Details on resource protocol are here: https://goo.gl/HHqeJA
export const LOCAL_PROTOCOL_STR = '(?:chrome|resource)://';
export const LOCAL_URL =
  new RegExp(`^(?:${LOCAL_PROTOCOL_STR}|/[^/]).*?`);
export const LOCAL_CSS_URL =
  new RegExp(`url\\(['"]?(?:${LOCAL_PROTOCOL_STR}|/[^/]).*?['"]?\\)`);
