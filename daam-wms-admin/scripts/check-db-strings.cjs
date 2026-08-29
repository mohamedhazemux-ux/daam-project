const fs = require('fs');
const path = require('path');

const dbContent = fs.readFileSync(path.join(__dirname, '../src/mocks/db.ts'), 'utf8');
const en = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/locales/en.json'), 'utf8'));

// Extract all Arabic string literals from mocks/db.ts
const arabicStrings = new Set();
const strRegex = /'([^'\\]*(?:\\.[^'\\]*)*)'|"([^"\\]*(?:\\.[^"\\]*)*)"/g;
let match;
const arCharRegex = /[\u0600-\u06FF]/;

while ((match = strRegex.exec(dbContent)) !== null) {
  const str = match[1] || match[2];
  if (str && arCharRegex.test(str) && !str.includes('\n')) {
    arabicStrings.add(str);
  }
}

console.log('Total unique Arabic strings in mocks/db.ts:', arabicStrings.size);
const missingFromEn = Array.from(arabicStrings).filter(s => !en[s]);
console.log('Missing from en.json:', missingFromEn.length);
if (missingFromEn.length > 0) {
  console.log('Sample missing:', missingFromEn.slice(0, 30));
  fs.writeFileSync(path.join(__dirname, 'missing-db-keys.json'), JSON.stringify(missingFromEn, null, 2), 'utf8');
}
