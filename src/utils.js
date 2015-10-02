/*
 * Template tag for removing whitespace and new lines
 * in order to be able to use multiline template strings
 * as a single string.
 *
 * Usage: singleLineString`foo bar baz
 *                    whatever`;
 *
 * Will output: 'foo bar baz whatever'
 *
 * Sometimes you do want newlines, you can manually add one with `<newline>`.
 *
 */

export function singleLineString(strings, ...vars) {
  // Interweave the strings with the
  // substitution vars first.
  let output = '';
  for (let i = 0; i < vars.length; i++) {
    output += strings[i] + vars[i];
  }
  output += strings[vars.length];

  // Split on newlines.
  let lines = output.split(/(?:\r\n|\n|\r)/);

  // Rip out the leading whitespace.
  return lines.map((line) => {
    return line.replace(/^\s+/gm, '');
  }).join(' ').trim().replace('<newline>', '\n');
}
