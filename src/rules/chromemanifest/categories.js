import { DANGEROUS_CATEGORY } from 'messages';
import { VALIDATION_WARNING } from 'const';


export const DANGEROUS_CATEGORIES = [
  'JavaScript-global-constructor',
  'JavaScript-global-constructor-prototype-alias',
  'JavaScript-global-property',
  'JavaScript-global-privileged-property',
  'JavaScript-global-static-nameset',
  'JavaScript-global-dynamic-nameset',
  'JavaScript-DOM-class',
  'JavaScript-DOM-interface',
];


export function checkCategories(triples, filename) {
  var validationMessages = [];

  for (let triple of triples) {
    if (triple.subject === 'category' &&
        (DANGEROUS_CATEGORIES.includes(triple.predicate) ||
         (triple.predicate === 'JavaScript' &&
          triple.object.startsWith('global ') ||
          triple.object.startsWith('DOM ')))) {
      var message = Object.assign({}, DANGEROUS_CATEGORY, {
        file: filename,
        line: triple.line,
        type: VALIDATION_WARNING,
      });
      validationMessages.push(message);
    }
  }
  return validationMessages;
}
