'use strict';

var addKeyword = require('./add_keyword');
var jsonMergePatch = require('json-merge-patch');

module.exports = function(ajv) {
  addKeyword(ajv, '$merge', jsonMergePatch.apply, { "type": "object" });
};
