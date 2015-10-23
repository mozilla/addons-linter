module.exports = function(grunt) {

  // load all grunt tasks matching the ['grunt-*', '@*/grunt-*'] patterns
  require('load-grunt-tasks')(grunt);

  var configs = require('load-grunt-configs')(grunt, {
    config: {
      src: 'tasks/*.js',
    },
  });

  grunt.initConfig(configs);

  grunt.registerTask('start', [
    'webpack:eslintwatch',
    'webpack:buildwatch',
  ]);

  grunt.registerTask('build', [
    'webpack:eslint',
    'webpack:build',
  ]);

  grunt.registerTask('test', [
    'clean',
    'instrument',
    'webpack:eslint',
    'webpack:coverage',
    'mochaTest',
    'storeCoverage',
    'makeReport',
    'eslint',
    'jscs',
  ]);

  grunt.registerTask('test-no-coverage', [
    'clean',
    'webpack:eslint',
    'webpack:test',
    'mochaTest',
    'eslint',
    'jscs',
  ]);

};
