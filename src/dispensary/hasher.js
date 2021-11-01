import createHash from 'sha.js';

export default function hasher(string) {
  return createHash('sha256').update(string, 'utf8').digest('hex');
}
