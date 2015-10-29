var fs = require('fs');
var md = require('markdown-it')();
var emoji = require('markdown-it-emoji');


module.exports = function(grunt) {

  // load all grunt tasks matching the ['grunt-*', '@*/grunt-*'] patterns
  require('load-grunt-tasks')(grunt);

  var configs = require('load-grunt-configs')(grunt, {
    config: {
      src: 'tasks/*.js',
    },
  });

  grunt.initConfig(configs);

  grunt.registerTask('buildrules', 'Build the rules', function() {
    md.use(emoji);
    var markdown = md.render(fs.readFileSync('docs/rules.md',
                                             { encoding: 'utf8' }));
    var template = fs.readFileSync('docs/rules.tmpl',
                                   { encoding: 'utf8' });
    var html = template.replace('{{MARKDOWN}}', markdown);
    fs.writeFileSync('docs/html/index.html', html);
  });

  grunt.registerTask('start', [
    'webpack:eslintwatch',
    'webpack:buildwatch',
  ]);

  grunt.registerTask('build', [
    'webpack:eslint',
    'webpack:build',
  ]);

  grunt.registerTask('publish-rules', [
    'copy',
    'buildrules',
    'gh-pages',
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
