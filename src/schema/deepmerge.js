import isMergeableObject from 'is-mergeable-object';

const empty = (val) => {
  return Array.isArray(val) ? [] : {};
};

const isObject = (obj) => obj && typeof obj === 'object';

const clone = (value) => {
  return isMergeableObject(value) ? merge(empty(value), value) : value;
};

const mergeArray = (target, source) => {
  const destination = target.slice();
  source.forEach((e, i) => {
    if (typeof destination[i] === 'undefined') {
      destination[i] = clone(e);
    } else if (isObject(e)) {
      destination[i] = merge(target[i], e);
    } else {
      destination.push(clone(e));
    }
  });
  return destination;
};

function merge(...objects) {
  return objects.reduce((target, source) => {
    const retval = Object.assign({}, target);

    Object.keys(source).forEach((key) => {
      const targetValue = target[key];
      const sourceValue = source[key];

      if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
        retval[key] = [...targetValue, ...sourceValue].filter(
          (element, index, array) => array.indexOf(element) === index
        );

        // If I use `mergeArray` instead then it's working "as before"
        // but merges a few keys incorrectly (see the output after the import)
        //
        // retval[key] = mergeArray(targetValue, sourceValue).filter(
        //   (element, index, array) => array.indexOf(element) === index
        // );
      } else if (isObject(targetValue) && isObject(sourceValue)) {
        retval[key] = merge(targetValue, sourceValue);
      } else {
        retval[key] = sourceValue;
      }
    });

    return retval;
  }, {});
}

export default (a, b) => {
  return merge(a, b);
};
