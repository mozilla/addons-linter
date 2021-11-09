export function urlFormat(url, { filename = null, version = null } = {}) {
  if (!filename || !version) {
    throw new Error('ArgumentError: File and version are required.');
  }

  let finalURL = url;
  // Both 'url' and '$FILENAME' can contain $VERSION several times
  while (finalURL.includes('$VERSION') || finalURL.includes('$FILENAME')) {
    finalURL = finalURL
      .replace(/\$VERSION/g, version)
      .replace(/\$FILENAME/g, filename);
  }

  return finalURL;
}
