Thanks for wanting to contribute to Mozilla's Add-ons Linter! You rock! 😊

## Submitting a Pull Request

If you're submitting a pull request, please reference the issue it closes
inside your pull request. Keep your commits atomic; you should have one
commit per issue solved.

Add tests for your code and make sure all existing tests pass. If the tests
fail or you don't maintain 100% test coverage we won't be able to accept your
pull request.

### Tests

Our tests include `eslint` style checks; these keep our code consistent.
You can review the rules in the [`.eslintrc`][eslint] file.

Please run the tests locally with `npm test` before you commit.

[eslint]: https://github.com/mozilla/addons-linter/blob/master/.eslintrc
