#!/usr/bin/env node
import path from 'path';

import { replaceInFileSync } from 'replace-in-file';

const PROJECT_ROOT = path.resolve(path.join(import.meta.dirname, '..'));
const README_FILE = path.join(PROJECT_ROOT, 'README.md');
const LIBRARIES_FILE = path.join(
  PROJECT_ROOT,
  'src/dispensary',
  'libraries.json'
);

const { default: libraries } = await import(LIBRARIES_FILE, {
  with: { type: 'json' },
});
const releasePages = [
  ...new Set(
    libraries.map((library) => {
      if (!library.releasePage) {
        throw new Error(
          `Missing 'releasePage' attribute for: ${library.name}.`
        );
      }

      return library.releasePage;
    })
  ),
];

const content = releasePages
  .map((releasePage) => `- ${releasePage}`)
  .join('\n');

try {
  const results = replaceInFileSync({
    files: README_FILE,
    from: /(<!--RELEASE_PAGES_START-->\n)[\s\S]*(\n\n<!--RELEASE_PAGES_END-->)/,
    to: `$1\n${content}$2`,
  });

  console.log(
    results[0].hasChanged
      ? 'README.md has been updated'
      : 'README.md is already up-to-date'
  );
} catch (error) {
  console.error('Error occurred:', error);
}
