module.exports = {
  create: (context) => {
    return {
      Identifier: (node) => {
        const metadata = context.settings.addonMetadata;

        if (typeof metadata !== 'object') {
          context.report(node, 'Metadata should be an object.');
        }

        if (metadata.guid !== 'snowflake') {
          context.report(node, 'Metadata properties not present.');
        }
      }
    }
  }
};
