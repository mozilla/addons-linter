[![Build Status](https://travis-ci.org/mozilla/addons-validator.svg?branch=master)](https://travis-ci.org/mozilla/addons-validator)
[![Coverage Status](https://coveralls.io/repos/mozilla/addons-validator/badge.svg?branch=master&service=github)](https://coveralls.io/github/mozilla/addons-validator?branch=master)
[![Dependency Status](https://david-dm.org/mozilla/addons-validator.svg)](https://david-dm.org/mozilla/addons-validator)
[![devDependency Status](https://david-dm.org/mozilla/addons-validator/dev-status.svg)](https://david-dm.org/mozilla/addons-validator#info=devDependencies)

# addons-validator

The Add-ons Validator, JS edition.

## Development

### Required node version

Node v0.12.x or greater is required. Using nvm is probably the easiest way
to manage multiple node versions side by side. See
[nvm on github](https://github.com/creationix/nvm) for more details.

### Install dependencies

Install dependencies with [npm](http://nodejs.org/):

```
npm install
```

Dependencies are automatically kept up-to-date using [greenkeeper](http://greenkeeper.io/).

### Testing

Tests use `grunt` but don't require global `grunt`. Just run:

```
npm test
```

### Logging

We use [bunyan](https://github.com/trentm/node-bunyan) for logging:

* By default logging is off (level is set to 'fatal') .
* Logging in tests can be enabled using an env var e.g: `LOG_LEVEL=debug grunt test`
* Logging on the cli can be enabled with `--log-level [level]`.
* Bunyan by default logs JSON. If you want the json to be pretty printed
  pipe anything that logs into `bunyan` e.g. `LOG_LEVEL=debug grunt test
  | node_modules/bunyan/bin/bunyan`


## Architecture

In a nutshell the way the validator works is to take an add-on
package, extract the metadata from the xpi (zip) format and then
process the files it finds through various content scanners.

### Scanners

Generally each file-type has a scanner. For example we have a CSS and a
JavaScript scanner amongst others. Each scanner looks at relevant
files and passes each file through a parser which then hands off to
various rules that look for specific things.

### Rules

Rules are exported via a single function in a single file. A rule can
have private functions it uses internally, but rule code should not depend
on another rule file and only one function should be exported per file.

Each rule function is passed data from the scanner in order to carry
out the specific checks for that rule it returns a list of objects which
are then made into message objects and are passed to the Collector.

### Collector

The Collector is simply an in-memory store for all the validation
message objects that are "collected" as the contents of the package are
processed.

### Messages

Each message has a code which is also its key. It has a message which
is a short outline of what the message represents, and a description
which is more detail into why that message was logged. The type of
the message is set as messages are added so that if necessary the
same message could be an error *or* a warning for example.

### Output

Lastly when the processing has been completed the validator will output
the collected data as text or JSON.
