/* eslint-disable no-console, import/no-extraneous-dependencies */
const fs = require('fs');

const webpack = require('webpack');

const webpackConfig = require('./webpack.config');

const babelrc = fs.readFileSync('./.babelrc');
const babelrcObject = JSON.parse(babelrc);
const babelPlugins = babelrcObject.plugins || [];

// Create UTC creation date in the correct format.
const potCreationDate = new Date()
  .toISOString()
  .replace('T', ' ')
  .replace(/:\d{2}.\d{3}Z/, '+0000');

const babelL10nPlugins = [
  [
    'module:babel-gettext-extractor',
    {
      headers: {
        'Project-Id-Version': 'messages',
        'Report-Msgid-Bugs-To': 'EMAIL@ADDRESS',
        'POT-Creation-Date': potCreationDate,
        'PO-Revision-Date': 'YEAR-MO-DA HO:MI+ZONE',
        'Last-Translator': 'FULL NAME <EMAIL@ADDRESS>',
        'Language-Team': 'LANGUAGE <LL@li.org>',
        'MIME-Version': '1.0',
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Transfer-Encoding': '8bit',
        'plural-forms': 'nplurals=2; plural=(n!=1);',
      },
      functionNames: {
        _: ['msgid'],
        dgettext: ['domain', 'msgid'],
        ngettext: ['msgid', 'msgid_plural', 'count'],
        dngettext: ['domain', 'msgid', 'msgid_plural', 'count'],
        pgettext: ['msgctxt', 'msgid'],
        dpgettext: ['domain', 'msgctxt', 'msgid'],
        npgettext: ['msgctxt', 'msgid', 'msgid_plural', 'count'],
        dnpgettext: ['domain', 'msgctxt', 'msgid', 'msgid_plural', 'count'],
      },
      fileName: `locale/templates/LC_MESSAGES/messages.pot`,
      baseDirectory: process.cwd(),
      stripTemplateLiteralIndent: true,
    },
  ],
];

const BABEL_QUERY = Object.assign({}, babelrcObject, {
  plugins: babelPlugins.concat(babelL10nPlugins),
});

const [rule] = webpackConfig.module.rules;
rule.loader = 'babel-loader';
rule.query = BABEL_QUERY;
delete rule.use;
const rules = [rule];
rules.concat(webpackConfig.module.rules.splice(0));

module.exports = Object.assign({}, webpackConfig, {
  module: {
    rules,
  },
  plugins: [
    // Don't generate modules for locale files.
    new webpack.IgnorePlugin(new RegExp(`locale\\/.*\\/messages\\.js$`)),
    ...webpackConfig.plugins,
  ],
});
