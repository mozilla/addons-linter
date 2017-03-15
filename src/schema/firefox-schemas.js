import fs from 'fs';
import path from 'path';

const schemaPath = 'src/schema/imported';
const schemas = fs.readdirSync(schemaPath).map((filename) => {
  const filePath = path.join(schemaPath, filename);
  return JSON.parse(fs.readFileSync(filePath));
});

export default schemas;
