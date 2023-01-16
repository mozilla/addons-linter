'use strict';

var addKeyword = require('./add_keyword');
var jsonPatch = require('fast-json-patch');

module.exports = function(ajv) {
  addKeyword(ajv, '$patch', jsonPatch.applyPatch, {
    "type": "array",
    "items": {
      "type": "object",
      "required": [ "op", "path" ],
      "properties": {
        "op": { "type": "string" },
        "path": { "type": "string", "format": "json-pointer" }
      },
      "anyOf": [
        {
          "properties": { "op": { "enum": [ "add", "replace", "test" ] } },
          "required": [ "value" ]
        },
        {
          "properties": { "op": { "enum": [ "remove" ] } }
        },
        {
          "properties": {
            "op": { "enum": [ "move", "copy" ] },
            "from": { "type": "string", "format": "json-pointer" }
          },
          "required": [ "from" ]
        }
      ]
    }
  });
};
