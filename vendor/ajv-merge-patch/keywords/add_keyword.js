'use strict';

// Based on https://nodejs.org/api/url.html#urlresolvefrom-to, but we strip the
// added leading slash to preserve the relativeness of `from`, similar to what
// `url.resolve()` was doing.
function resolve(from, to) {
  const resolvedUrl = new URL(to, new URL(from, 'resolve://'));
  if (resolvedUrl.protocol === 'resolve:') {
    // `from` is a relative URL.
    const { pathname, search, hash } = resolvedUrl;
    return pathname.slice(1) + search + hash;
  }
  return resolvedUrl.toString();
}

module.exports = function (ajv, keyword, jsonPatch, patchSchema) {
  ajv.addKeyword({
    keyword: keyword,
    macro: function (schema, parentSchema, it) {
      var source = schema.source;
      var patch = schema.with;
      if (source.$ref) source = JSON.parse(JSON.stringify(getSchema(source.$ref)));
      if (patch.$ref) patch = getSchema(patch.$ref);
      jsonPatch.call(null, source, patch, true);
      return source;

      function getSchema($ref) {
        var id = it.baseId && it.baseId != '#'
                  ? resolve(it.baseId, $ref)
                  : $ref;
        var validate = ajv.getSchema(id);
        if (validate) return validate.schema;
        throw new ajv.constructor.MissingRefError(it.baseId, $ref);
      }
    },
    metaSchema: {
      "type": "object",
      "required": [ "source", "with" ],
      "additionalProperties": false,
      "properties": {
        "source": {
          "anyOf": [
            {
              "type": "object",
              "required": [ "$ref" ],
              "additionalProperties": false,
              "properties": {
                "$ref": {
                  "type": "string",
                  "format": "uri"
                }
              }
            },
            { "$ref": "http://json-schema.org/draft-07/schema#" }
          ]
        },
        "with": patchSchema
      }
    }
  });
};
