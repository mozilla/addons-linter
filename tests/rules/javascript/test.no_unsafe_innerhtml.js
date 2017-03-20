import { VALIDATION_WARNING } from 'const';
import JavaScriptScanner from 'scanners/javascript';
import {
  UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT,
  NO_DOCUMENT_WRITE } from 'messages';


// These rules were mostly copied and adapted from
// https://github.com/mozfreddyb/eslint-plugin-no-unsafe-innerhtml/
// Please make sure to keep them up-to-date and report upstream errors.
// Some notes are not included since we have our own rules
// marking them as invalid (e.g document.write)


describe('no_unsafe_innerhtml', () => {
  var validCodes = [
    // innerHTML equals
    'a.innerHTML = \'\';',
    'c.innerHTML = ``;',
    'g.innerHTML = Sanitizer.escapeHTML``;',
    'h.innerHTML = Sanitizer.escapeHTML`foo`;',
    'i.innerHTML = Sanitizer.escapeHTML`foo${bar}baz`;',

    // tests for innerHTML update (+= operator)
    'a.innerHTML += \'\';',
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

    // override for manual review and legacy code
    'g.innerHTML = potentiallyUnsafe; // a=legacy, bug 1155131',

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


  for (const code of validCodes) {
    it(`should allow the use of innerHTML: ${code}`, () => {
      var jsScanner = new JavaScriptScanner(code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          assert.equal(validationMessages.length, 0);
        });
    });
  }


  var invalidCodes = [
    // innerHTML examples
    {
      code: 'm.innerHTML = htmlString;',
      message: ['Unsafe assignment to innerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'a.innerHTML += htmlString;',
      message: ['Unsafe assignment to innerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'a.innerHTML += template.toHtml();',
      message: ['Unsafe assignment to innerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'm.outerHTML = htmlString;',
      message: ['Unsafe assignment to outerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 't.innerHTML = `<span>${name}</span>`;',
      message: ['Unsafe assignment to innerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 't.innerHTML = `<span>${"foobar"}</span>${evil}`;',
      message: ['Unsafe assignment to innerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },

    // insertAdjacentHTML examples
    {
      code: 'node.insertAdjacentHTML("beforebegin", htmlString);',
      message: ['Unsafe call to insertAdjacentHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'node.insertAdjacentHTML("beforebegin", template.getHTML());',
      message: ['Unsafe call to insertAdjacentHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },

    // (binary) expressions
    {
      code: 'node.innerHTML = "<span>"+ htmlInput;',
      message: ['Unsafe assignment to innerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'node.innerHTML = "<span>" + htmlInput + "</span>";',
      message: ['Unsafe assignment to innerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },

    // document.write / writeln
    {
      code: 'document.write("<span>" + htmlInput + "</span>");',
      message: [
        'Use of document.write strongly discouraged.',
        'Unsafe call to document.write',
      ],
      description: [
        NO_DOCUMENT_WRITE.description,
        UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'document.writeln(evil);',
      message: ['Unsafe call to document.writeln'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },

    // bug https://bugzilla.mozilla.org/show_bug.cgi?id=1198200
    {
      code: 'title.innerHTML = _("WB_LT_TIPS_S_SEARCH", {value0:engine});',
      message: ['Unsafe assignment to innerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },

    // https://bugzilla.mozilla.org/show_bug.cgi?id=1192595
    {
      code: 'x.innerHTML = Sanitizer.escapeHTML(evil)',
      message: ['Unsafe assignment to innerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'x.innerHTML = Sanitizer.escapeHTML(`evil`)',
      message: ['Unsafe assignment to innerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'y.innerHTML = ((arrow_function)=>null)`some HTML`',
      message: ['Unsafe assignment to innerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'y.innerHTML = ((arrow_function)=>null)`some HTML`',
      message: ['Unsafe assignment to innerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
    {
      code: 'y.innerHTML = ((arrow_function)=>null)`some HTML`',
      message: ['Unsafe assignment to innerHTML'],
      description: [UNSAFE_DYNAMIC_VARIABLE_ASSIGNMENT.description],
    },
  ];

  for (const code of invalidCodes) {
    it(`should not allow the use of innerHTML examples ${code.code}`, () => {
      var jsScanner = new JavaScriptScanner(code.code, 'badcode.js');

      return jsScanner.scan()
        .then((validationMessages) => {
          validationMessages = validationMessages.sort();

          assert.equal(validationMessages.length, code.message.length);

          code.message.forEach((expectedMessage, idx) => {
            assert.equal(validationMessages[idx].message, expectedMessage);
            assert.equal(validationMessages[idx].type, VALIDATION_WARNING);
          });

          code.description.forEach((expectedDescription, idx) => {
            assert.equal(
              validationMessages[idx].description, expectedDescription);
          });
        });
    });
  }
});
