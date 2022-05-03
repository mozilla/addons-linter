// See: https://jestjs.io/docs/code-transformation#typescript-with-type-checking
module.exports = {
  process(sourceText) {
    return {
      code: `module.exports = ${JSON.stringify(sourceText)};`,
    };
  },
};
