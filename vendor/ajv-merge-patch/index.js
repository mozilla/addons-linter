'use strict';

var addMerge = require('./keywords/merge');
var addPatch = require('./keywords/patch');

/**
 * Defines keywords $merge and $patch in Ajv instance
 * @param  {Ajv} ajv validator instance
 */
module.exports = function addKeywords(ajv) {
  addMerge(ajv);
  addPatch(ajv);
};
