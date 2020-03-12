/* eslint-disable no-template-curly-in-string */
import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import {
  UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT,
  NO_DOCUMENT_WRITE,
} from 'messages';

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
    'c.innerHTML = ``;',
    'g.innerHTML = Sanitizer.escapeHTML``;',
    'h.innerHTML = Sanitizer.escapeHTML`foo`;',
    'i.innerHTML = Sanitizer.escapeHTML`foo${bar}baz`;',

    // tests for innerHTML update (+= operator)
    "a.innerHTML += '';",
    'b.innerHTML += "";',
    'c.innerHTML += ``;',
    'g.innerHTML += Sanitizer.escapeHTML``;',
    'h.innerHTML += Sanitizer.escapeHTML`foo`;',
    'i.innerHTML += Sanitizer.escapeHTML`foo${bar}baz`;',
    'i.innerHTML += Sanitizer.unwrapSafeHTML(htmlSnippet)',
    'i.outerHTML += Sanitizer.unwrapSafeHTML(htmlSnippet)',

    // testing unwrapSafeHTML spread
    'this.imeList.innerHTML = Sanitizer.unwrapSafeHTML(...listHtml);',

    // tests for insertAdjacentHTML calls
    'n.insertAdjacentHTML("afterend", "meh");',
    'n.insertAdjacentHTML("afterend", `<br>`);',
    'n.insertAdjacentHTML("afterend", Sanitizer.escapeHTML`${title}`);',

    // (binary) expressions
    'x.innerHTML = `foo`+`bar`;',
    'y.innerHTML = "<span>" + 5 + "</span>";',

    // document.write/writeln
    'document.writeln(Sanitizer.escapeHTML`<em>${evil}</em>`);',

    // template string expression tests
    'u.innerHTML = `<span>${"lulz"}</span>`;',
    'v.innerHTML = `<span>${"lulz"}</span>${55}`;',
    'w.innerHTML = `<span>${"lulz"+"meh"}</span>`;',
  ];

  validCodes.forEach((code) => {
    it(`should allow the use of innerHTML: ${code}`, async () => {
      const jsScanner = new JavaScriptScanner(code, 'badcode.js');

      const { linterMessages } = await jsScanner.scan();
      expect(linterMessages.length).toEqual(0);
    });
  });

  const invalidCodes = [
    // innerHTML examples
    {
      code: 'm.innerHTML = htmlString;',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'a.innerHTML += htmlString;',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'a.innerHTML += template.toHtml();',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'm.outerHTML = htmlString;',
      message: ['Unsafe assignment to outerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 't.innerHTML = `<span>${name}</span>`;',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 't.innerHTML = `<span>${"foobar"}</span>${evil}`;',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      // This used to be allowed by the upstream npm package, 
      // but it has been deprecated (and disallowed) starting from
      // https://github.com/mozilla/eslint-plugin-no-unsanitized/pull/20
      code: 'g.innerHTML = potentiallyUnsafe; // a=legacy, bug 1155131',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },

    // insertAdjacentHTML examples
    {
      code: 'node.insertAdjacentHTML("beforebegin", htmlString);',
      message: ['Unsafe call to node.insertAdjacentHTML for argument 1'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'node.insertAdjacentHTML("beforebegin", template.getHTML());',
      message: ['Unsafe call to node.insertAdjacentHTML for argument 1'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },

    // (binary) expressions
    {
      code: 'node.innerHTML = "<span>"+ htmlInput;',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'node.innerHTML = "<span>" + htmlInput + "</span>";',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
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
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },

    // bug https://bugzilla.mozilla.org/show_bug.cgi?id=1198200
    {
      code: 'title.innerHTML = _("WB_LT_TIPS_S_SEARCH", {value0:engine});',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },

    // https://bugzilla.mozilla.org/show_bug.cgi?id=1192595
    {
      code: 'x.innerHTML = Sanitizer.escapeHTML(evil)',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'x.innerHTML = Sanitizer.escapeHTML(`evil`)',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'y.innerHTML = ((arrow_function)=>null)`some HTML`',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'y.innerHTML = ((arrow_function)=>null)`some HTML`',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'y.innerHTML = ((arrow_function)=>null)`some HTML`',
      message: ['Unsafe assignment to innerHTML'],
      id: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.code],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
  ];

  invalidCodes.forEach((code) => {
    it(`should not allow the use of innerHTML examples ${code.code}`, async () => {
      const jsScanner = new JavaScriptScanner(code.code, 'badcode.js');

      const { linterMessages } = await jsScanner.scan();
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
