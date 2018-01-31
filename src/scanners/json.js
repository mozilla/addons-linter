import JSONParser from 'parsers/json';
import MessagesJSONParser from 'parsers/messagesjson';
import BaseScanner from 'scanners/base';
import { MESSAGES_JSON, LOCALES_DIRECTORY } from 'const';


export default class JSONScanner extends BaseScanner {
  static get scannerName() {
    return 'json';
  }

  async _getContents() {
    return this.contents;
  }

  async scan() {
    const json = await this.getContents();

    if (this.filename.endsWith(MESSAGES_JSON) && this.filename.startsWith(LOCALES_DIRECTORY)) {
      const messagesJSONParser = new MessagesJSONParser(
        json,
        this.options.collector,
        { filename: this.filename }
      );
      messagesJSONParser.parse();
    } else {
      const jsonParser = new JSONParser(
        json,
        this.options.collector,
        { filename: this.filename }
      );
      jsonParser.parse();
    }

    return {
      linterMessages: [],
      scannedFiles: [this.filename],
    };
  }
}
