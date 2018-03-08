/* eslint-disable import/no-extraneous-dependencies, global-require */
const fs = require('fs');

const md = require('markdown-it')();
const emoji = require('markdown-it-emoji');
const markdownItAnchor = require('markdown-it-anchor');


module.exports = (grunt) => {
  // load all grunt tasks matching the ['grunt-*', '@*/grunt-*'] patterns
  require('load-grunt-tasks')(grunt);

  const configs = require('load-grunt-configs')(grunt, {
    config: {
      src: 'tasks/*.js',
    },
  });

  grunt.initConfig(configs);

  grunt.registerTask('build-rules-html', 'Build the rules', () => {
    md.use(emoji);
    md.use(markdownItAnchor, {
      permalink: true,
    });
    const markdown = md.render(fs.readFileSync('docs/rules.md',
      { encoding: 'utf8' }));
    const template = fs.readFileSync('docs/rules.tmpl',
      { encoding: 'utf8' });
    const html = template.replace('{{MARKDOWN}}', markdown);
    fs.writeFileSync('docs/html/index.html', html);
  });

  grunt.registerTask('publish-rules', 'travis rule doc publishing', () => {
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
};
