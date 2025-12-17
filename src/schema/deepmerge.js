/**
 * deepmerge 2.0 changed the way the array merge worked. This is the suggested
 * solution from their README for how to use the old version.
 *
 * https://github.com/KyleAMathews/deepmerge/blob/3ab89f2d2c938fc2e045c4ba822da0ffb81e4891/readme.md#arraymerge
 */

import merge from 'deepmerge';

const emptyTarget = (value) => (Array.isArray(value) ? [] : {});
const clone = (value, options) => merge(emptyTarget(value), value, options);

function patchArrays(target, source, options) {
  const destination = target.slice();

  source.forEach((e, i) => {
    if (typeof destination[i] === 'undefined') {
      const cloneRequested = options.clone !== false;
      const shouldClone = cloneRequested && options.isMergeableObject(e);
      destination[i] = shouldClone ? clone(e, options) : e;
    } else if (options.isMergeableObject(e)) {
      destination[i] = merge(target[i], e, options);
    } else if (target.indexOf(e) === -1) {
      destination.push(e);
    }
  });

  return destination;
}

function concatArrays(target, source) {
  return [...target, ...source].filter(
    (element, index, array) => array.indexOf(element) === index
  );
}

export const deepmerge = (a, b) => {
  return merge(a, b, { arrayMerge: concatArrays });
};

export const deepPatch = (a, b) => {
  return merge(a, b, { arrayMerge: patchArrays });
};
