/* eslint-disable no-template-curly-in-string */
import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import {
  UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT,
  NO_DOCUMENT_WRITE,
} from 'messages';

import { runJsScanner } from '../../helpers';

// These rules were mostly copied and adapted from:
// https://github.com/mozilla/eslint-plugin-no-unsanitized/tree/master/tests/rules
//
// Please make sure to keep them up-to-date and report upstream errors.
// Some notes are not included since we have our own rules
// marking them as invalid (e.g document.write)

describe('no_unsafe_innerhtml', () => {
  const validCodes = [
    // innerHTML equals
    "a.innerHTML = '';",
    "a.innerHTML *= 'test';",
    'c.innerHTML = ``;',

    // tests for innerHTML update (+= operator)
    "a.innerHTML += '';",
    'b.innerHTML += "";',
    'c.innerHTML += ``;',

    // (binary) expressions
    'x.innerHTML = `foo`+`bar`;',
    'y.innerHTML = "<span>" + 5 + "</span>";',

    // template string expression tests
    "u.innerHTML = `<span>${'lulz'}</span>`;",
    "v.innerHTML = `<span>${'lulz'}</span>${55}`;",
    "w.innerHTML = `<span>${'lulz'+'meh'}</span>`;",

    // Native method (Check customize code doesn't include these)
    'document.toString = evil;',
    'document.toString(evil);',

    // tests for insertAdjacentHTML calls
    'n.insertAdjacentHTML("afterend", "meh");',
    'n.insertAdjacentHTML("afterend", `<br>`);',

    // document.write/writeln
    'otherNodeWeDontCheckFor.writeln(evil);',

    // template string expression tests
    'u.innerHTML = `<span>${"lulz"}</span>`;',
    'v.innerHTML = `<span>${"lulz"}</span>${55}`;',
    'w.innerHTML = `<span>${"lulz"+"meh"}</span>`;',

    // rule should not barf on a CallExpression result being called again
    '  _tests.shift()();',
    '(Async.checkAppReady = function() { return true; })();',
    'let endTime = (mapEnd || (e => e.delta))(this._data[this._data.length - 1]);',
    "(text.endsWith('\\n') ? document.write : document.writeln)(text)",

    // issue 71 https://github.com/mozilla/eslint-plugin-no-unsanitized/issues/71
    'function foo() { return this().bar(); };',

    // issue 79 https://github.com/mozilla/eslint-plugin-no-unsanitized/issues/79
    `range.createContextualFragment('<p class="greeting">Hello!</p>');`,
  ];

  validCodes.forEach((code) => {
    it(`should allow the use of innerHTML: ${code}`, async () => {
      const jsScanner = new JavaScriptScanner(code, 'badcode.js');

      const { linterMessages } = await runJsScanner(jsScanner);
      expect(linterMessages.length).toEqual(0);
    });
  });

  const invalidCodes = [
    // innerHTML examples
    {
      code: 'm.innerHTML = htmlString;',
    },
    {
      code: 'a.innerHTML += htmlString;',
    },
    {
      code: 'a.innerHTML += template.toHtml();',
    },
    {
      code: 'm.outerHTML = htmlString;',
      message: ['Unsafe assignment to outerHTML'],
    },
    {
      code: 't.innerHTML = `<span>${name}</span>`;',
    },
    {
      code: 't.innerHTML = `<span>${"foobar"}</span>${evil}`;',
    },

    // (binary) expressions
    {
      code: "node.innerHTML = '<span>'+ htmlInput;",
    },
    {
      code: "node.innerHTML = '<span>'+ htmlInput + '</span>';",
    },

    // bug https://bugzilla.mozilla.org/show_bug.cgi?id=1198200
    {
      code: "title.innerHTML = _('WB_LT_TIPS_S_SEARCH', {value0:engine});",
    },

    // https://bugzilla.mozilla.org/show_bug.cgi?id=1192595
    {
      code: 'x.innerHTML = Sanitizer.escapeHTML(evil)',
    },
    {
      code: 'x.innerHTML = Sanitizer.escapeHTML(`evil`)',
    },
    {
      code: 'y.innerHTML = ((arrow_function)=>null)`some HTML`',
    },

    // testing unwrapSafeHTML spread sanitizer typo
    {
      code: 'this.imeList.innerHTML = Sanitizer.unrapSafeHTML(...listHtml);',
    },

    // the previous override for manual review and legacy code is now invalid
    {
      // This used to be allowed by the upstream npm package,
      // but it has been deprecated (and disallowed) starting from
      // https://github.com/mozilla/eslint-plugin-no-unsanitized/pull/20
      code: 'g.innerHTML = potentiallyUnsafe; // a=legacy, bug 1155131',
    },
    {
      code: 'function foo() { return this().innerHTML = evil; };',
    },

    // insertAdjacentHTML examples
    {
      code: 'node.insertAdjacentHTML("beforebegin", htmlString);',
      message: ['Unsafe call to node.insertAdjacentHTML for argument 1'],
    },
    {
      code: 'node.insertAdjacentHTML("beforebegin", template.getHTML());',
      message: ['Unsafe call to node.insertAdjacentHTML for argument 1'],
    },

    // (binary) expressions
    {
      code: 'node.innerHTML = "<span>"+ htmlInput;',
      message: ['Unsafe assignment to innerHTML'],
    },
    {
      code: 'node.innerHTML = "<span>" + htmlInput + "</span>";',
      message: ['Unsafe assignment to innerHTML'],
    },

    // document.write / writeln
    {
      code: 'document.write("<span>" + htmlInput + "</span>");',
      message: [
        'Use of document.write strongly discouraged.',
        'Unsafe call to document.write for argument 0',
      ],
      id: [NO_DOCUMENT_WRITE.code, UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [
        NO_DOCUMENT_WRITE.description,
        UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description,
      ],
    },
    {
      code: 'documentish.write("<span>" + htmlInput + "</span>");',
      message: ['Unsafe call to documentish.write for argument 0'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'documentIframe.write("<span>" + htmlInput + "</span>");',
      message: ['Unsafe call to documentIframe.write for argument 0'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },

    {
      code: 'document.write(undefined);',
      message: [
        'Use of document.write strongly discouraged.',
        'Unsafe call to document.write for argument 0',
      ],
      id: [NO_DOCUMENT_WRITE.code, UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [
        NO_DOCUMENT_WRITE.description,
        UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description,
      ],
    },
    {
      code: 'document.writeln(evil);',
      message: ['Unsafe call to document.writeln for argument 0'],
    },
    {
      code: 'window.document.writeln(bad);',
      message: ['Unsafe call to window.document.writeln for argument 0'],
    },

    // issue 71 https://github.com/mozilla/eslint-plugin-no-unsanitized/issues/71
    {
      code: 'function foo() { return this().insertAdjacentHTML(foo, bar); };',
      message: ['Unsafe call to this().insertAdjacentHTML for argument 1'],
    },

    // Test that stem from formar parser errors and breakage
    {
      code: 'getDocument(myID).write(evil)',
      message: ['Unsafe call to getDocument(myID).write for argument 0'],
    },

    // Issue 79: Warn for use of createContextualFragment
    {
      code: 'range.createContextualFragment(badness)',
      message: ['Unsafe call to range.createContextualFragment for argument 0'],
    },

    // bug https://bugzilla.mozilla.org/show_bug.cgi?id=1198200
    {
      code: 'title.innerHTML = _("WB_LT_TIPS_S_SEARCH", {value0:engine});',
    },

    // https://bugzilla.mozilla.org/show_bug.cgi?id=1192595
    {
      code: 'x.innerHTML = Sanitizer.escapeHTML(evil)',
    },
    {
      code: 'x.innerHTML = Sanitizer.escapeHTML(`evil`)',
    },
    {
      code: 'y.innerHTML = ((arrow_function)=>null)`some HTML`',
    },
    {
      code: 'y.innerHTML = ((arrow_function)=>null)`some HTML`',
    },
    {
      code: 'y.innerHTML = ((arrow_function)=>null)`some HTML`',
    },

    // Escapers and unwrappers allowed by default should be disabled
    // by the addons-linter customized config for this rule.
    {
      code: 'g.innerHTML += Sanitizer.escapeHTML``;',
    },
    {
      code: 'g.innerHTML = Sanitizer.escapeHTML``;',
    },
    {
      code: 'h.innerHTML = Sanitizer.escapeHTML`foo`;',
    },
    {
      code: 'i.innerHTML = Sanitizer.escapeHTML`foo${bar}baz`;',
    },
    {
      code: 'h.innerHTML += Sanitizer.escapeHTML`foo`;',
    },
    {
      code: 'i.innerHTML += Sanitizer.escapeHTML`foo${bar}baz`;',
    },
    {
      code: 'i.innerHTML += Sanitizer.unwrapSafeHTML(htmlSnippet)',
    },
    {
      code: 'i.outerHTML += Sanitizer.unwrapSafeHTML(htmlSnippet)',
      message: ['Unsafe assignment to outerHTML'],
    },
    {
      code: 'this.imeList.innerHTML = Sanitizer.unwrapSafeHTML(...listHtml);',
    },
    {
      code: 'n.insertAdjacentHTML("afterend", Sanitizer.escapeHTML`${title}`);',
      message: ['Unsafe call to n.insertAdjacentHTML for argument 1'],
    },
    {
      code: 'document.writeln(Sanitizer.escapeHTML`<em>${evil}</em>`);',
      message: ['Unsafe call to document.writeln for argument 0'],
    },
  ];

  const defaultProps = {
    message: ['Unsafe assignment to innerHTML'],
    id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
    description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
  };

  invalidCodes.forEach((testCase) => {
    const code = { ...defaultProps, ...testCase };

    it(`should not allow the use of innerHTML examples ${code.code}`, async () => {
      const jsScanner = new JavaScriptScanner(code.code, 'badcode.js');

      const { linterMessages } = await runJsScanner(jsScanner);
      linterMessages.sort();

      expect(linterMessages.length).toEqual(code.message.length);

      code.message.forEach((expectedMessage, idx) => {
        expect(linterMessages[idx].message).toEqual(expectedMessage);
        expect(linterMessages[idx].type).toEqual(VALIDATION_WARNING);
      });

      code.id.forEach((expectedId, idx) => {
        expect(linterMessages[idx].code).toEqual(expectedId);
      });

      code.description.forEach((expectedDescription, idx) => {
        expect(linterMessages[idx].description).toEqual(expectedDescription);
      });
    });
  });
});
