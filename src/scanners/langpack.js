import { extname } from 'path';

import FluentParser from 'parsers/fluent';
import PropertiesParser from 'parsers/properties';
import DoctypeParser from 'parsers/doctype';
import BaseScanner from 'scanners/base';


export default class LangpackScanner extends BaseScanner {
  static get scannerName() {
    return 'langpack';
  }

  _getContents() {
    return Promise.resolve(this.contents);
  }

  scan() {
    return this.getContents()
      .then((data) => {
        const ext = extname(this.filename);
        let ParserClass = null;

        if (ext === '.properties') {
          ParserClass = PropertiesParser;
        } else if (ext === '.ftl') {
          ParserClass = FluentParser;
        } else if (ext === '.dtd') {
          ParserClass = DoctypeParser;
        } else {
          throw new Error('Unsupported file type');
        }

        const parser = new ParserClass(data, this.options.collector, {
          filename: this.filename,
        });

        parser.parse();

        // The parsers report directly to the collector so we don't have to
        // forward them anymore.
        return Promise.resolve({
          linterMessages: [],
          scannedFiles: [this.filename],
        });
      })
      .catch((err) => {
        return Promise.reject(err);
      });
  }
}
