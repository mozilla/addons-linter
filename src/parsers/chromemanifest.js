import readline from 'readline';


export default class ChromeManifestParser {

  constructor(stream, filename) {
    this.stream = stream;
    this.filename = filename;
    this.triples = null;
  }

  filterTriples({subject, predicate, object} = {}) {
    return this.parse()
      .then((triples) => {
        return new Promise((resolve) => {
          var filteredTriples = triples.filter((triple) => {
            var searches = {subject, predicate, object};
            for (let key in searches) {
              let val = searches[key];
              if (typeof val !== undefined && val === triple[key]) {
                return true;
              }
            }
          });

          resolve(filteredTriples);
        });
      });
  }

  parse() {
    return new Promise((resolve) => {
      if (this.triples !== null) {
        resolve(this.triples);
      } else {
        this.triples = [];
      }

      var lineCount = 0;

      var rl = readline.createInterface({
        input: this.stream,
      });

      rl.on('line', (line) => {
        lineCount += 1;

        if (line.trim().startsWith('#', 0) === true) {
          return;
        }

        var triple = line.split(/\s+/, 3);
        if (triple.length === 2) {
          triple.push('');
        } else if (triple.length < 3) {
          return;
        }

        this.triples.push({
          subject: triple[0],
          predicate: triple[1],
          object: triple[2],
          line: lineCount,
          filename: this.filename,
        });
      });

      rl.on('close', () => {
        resolve(this.triples);
      });
    });
  }
}
