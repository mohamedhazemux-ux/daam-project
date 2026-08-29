const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../src/locales/en.json');
const arPath = path.join(__dirname, '../src/locales/ar.json');
const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const arRegex = /[\u0600-\u06FF]/;
const remainingKeys = Object.keys(en).filter(k => arRegex.test(en[k]));
console.log('Total remaining keys to translate:', remainingKeys.length);
fs.writeFileSync(path.join(__dirname, 'remaining-untranslated.json'), JSON.stringify(remainingKeys, null, 2), 'utf8');
