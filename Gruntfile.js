var fs = require('fs');
var md = require('markdown-it')();
var emoji = require('markdown-it-emoji');
var markdownItAnchor = require('markdown-it-anchor');


module.exports = function(grunt) {

  // load all grunt tasks matching the ['grunt-*', '@*/grunt-*'] patterns
  require('load-grunt-tasks')(grunt);

  var configs = require('load-grunt-configs')(grunt, {
    config: {
      src: 'tasks/*.js',
    },
  });

  grunt.initConfig(configs);

  grunt.registerTask('build-rules-html', 'Build the rules', function() {
    md.use(emoji);
    md.use(markdownItAnchor, {
      permalink: true,
    });
    var markdown = md.render(fs.readFileSync('docs/rules.md',
                                             { encoding: 'utf8' }));
    var template = fs.readFileSync('docs/rules.tmpl',
                                   { encoding: 'utf8' });
    var html = template.replace('{{MARKDOWN}}', markdown);
    fs.writeFileSync('docs/html/index.html', html);
  });

  grunt.registerTask('start', [
    'webpack:buildwatch',
  ]);

  grunt.registerTask('build', [
    'webpack:build',
  ]);

  grunt.registerTask('publish-rules', 'travis rule doc publishing', function() {
    // Require the rules build and copy.
    this.requires(['copy', 'build-rules-html']);

    if (process.env.TRAVIS === 'true' &&
        process.env.TRAVIS_SECURE_ENV_VARS === 'true' &&
        process.env.TRAVIS_PULL_REQUEST === 'false') {
      grunt.log.writeln('Pushing branch for docker build');
      grunt.task.run('gh-pages');
    } else {
      grunt.log.writeln('Skipping rules publication.');
    }
  });

  grunt.registerTask('test', [
    'clean',
    'webpack:build',
    'webpack:coverage',
    'mochaTest:coverage',
    'newer:eslint',
  ]);

  grunt.registerTask('test-no-coverage', [
    'clean',
    'webpack:build',
    'webpack:test',
    'mochaTest:test',
    'newer:eslint',
  ]);
};
