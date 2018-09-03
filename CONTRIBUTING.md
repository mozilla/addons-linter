Hi! Thanks for wanting to contribute to Mozilla's Add-ons Linter! You rock! 😊

This linter is used to help develop and publish [Add-ons](https://developer.mozilla.org/Add-ons/) for Firefox. You're an add-on developer, we would really value your contributions–no one knows add-on development and publishing better than an add-on developer!

Here are links to all the sections in this document:

<!-- If you change any of the headings in this document, remember to update the table of contents. -->
<!-- To update the TOC, run the command `npm run gen-contributing-toc` from your root directory and you will auto generate a new TOC. -->

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Picking an issue](#picking-an-issue)
- [Installation](#installation)
- [Testing the linter](#testing-the-linter)
  - [Run all tests](#run-all-tests)
  - [Run a single test](#run-a-single-test)
  - [Debug a test](#debug-a-test)
- [Build addons-linter](#build-addons-linter)
- [Creating a pull request](#creating-a-pull-request)
- [Writing commit messages](#writing-commit-messages)
  - [Tips](#tips)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# Picking an issue

For first-time contributors or those who want to start with a small task: [check out our list of good first bugs](https://github.com/mozilla/addons-linter/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+bug%22). These issues have an assigned mentor to help you out and are great issues for learning about the linter and our development process.

If you're already familiar with the project or would like take on something a little more challenging, please take a look at the [contrib: welcome](https://github.com/mozilla/addons-linter/issues?q=is%3Aissue+is%3Aopen+label%3A"contrib%3A+welcome) issues.

If you'd like to work on a bug, please comment on it to let the maintainers know. If someone else has already commented and taken up that bug, please refrain from working on it and submitting a PR without asking the maintainers as it leads to unnecessary duplication of effort.

# Installation

To get started on a patch, first install `addons-linter` from [source](README.md#development).

# Testing the linter

To run tests and check for JavaScript syntax issues as you change the code, run:

    npm test

## Run all tests

To run the entire suite of tests once and exit, type:

    npm run test-once

This is the same as the `npm test` command but it won't re-run automatically as you edit files.

## Run a single test

Instead of running the entire suite, you can run a single test by invoking the `jest` executable directly with the `-t` option to filter by test description. For example, if the test you'd like to run is defined in `tests/test.linter.js` and is described as "should collect an error when not an xpi/zip" then you could run it like this:

    ./node_modules/.bin/jest -r tests/test.linter.js -f "not an xpi/zip"

## Debug a test

You can enter the [Node debugger](https://nodejs.org/api/debugger.html) by directly invoking the `npm run debug` command. For example, if the test you want to debug is defined in `tests/test.linter.js` then you could enter the debugger like this:

    node --inspect --inspect-brk ./node_modules/.bin/jest tests/test.linter.js -t 'flag potentially minified'

You could also put the `debugger` statement somewhere in the code to set a breakpoint.

# Build addons-linter

Type `npm run build` to build a new version of the libraries used by the `./bin/addons-linter` command. When successful, you will see newly built files in the `./dist/` directory.

# Creating a pull request

When you create a [pull request](https://help.github.com/articles/creating-a-pull-request/) for a new fix or feature, be sure to mention the issue number for what you're working on. The best way to do it is to mention the issue like this at the top of your description:

    Fixes #123

The issue number in this case is "123." The word _Fixes_ is magical; GitHub will automatically close the issue when your pull request is merged.

Please run [Prettier](https://github.com/mozilla/addons-linter/blob/master/README.md#Prettier) to format your code.

# Writing commit messages

Good commit messages serve at least three important purposes:

- They speed up the reviewing process.
- They help us write good release notes.
- They help future maintainers understand your change and the reasons behind it.

Structure your commit message like this:

From: [[http://git-scm.com/book/ch5-2.html]]

> ```
> Short (50 chars or less) summary of changes
>
> More detailed explanatory text, if necessary. Wrap it to about 72
> characters or so. In some contexts, the first line is treated as the
> subject of an email and the rest of the text as the body. The blank
> line separating the summary from the body is critical (unless you omit
> the body entirely); tools like rebase can get confused if you run the
> two together.
>
> Further paragraphs come after blank lines.
>
>   - Bullet points are okay, too
>
>   - Typically a hyphen or asterisk is used for the bullet, preceded by a
>     single space, with blank lines in between, but conventions vary here
> ```

- Write the summary line and description of what you have done in the imperative mode, that is as if you were commanding someone. Start the line with "Fix", "Add", "Change" instead of "Fixed", "Added", "Changed".
- Always leave the second line blank.
- Be as descriptive as possible in the description. It helps reasoning about the intention of commits and gives more context about why changes happened.

## Tips

- If it seems difficult to summarize what your commit does, it may be because it includes several logical changes or bug fixes, and are better split up into several commits using `git add -p`.
