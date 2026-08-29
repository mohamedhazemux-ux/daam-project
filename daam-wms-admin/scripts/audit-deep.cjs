// scripts/audit-deep.cjs
const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync('./src/locales/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('./src/locales/ar.json', 'utf8'));

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
const arabicRegex = /[\u0600-\u06FF]/;
const tRegex = /t\(\s*['"`]([\u0600-\u06FF][^'"`]*)['"`]\s*\)/g;

let missingKeysInEn = new Set();
let filesWithRawArabic = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  
  // 1. Check all t('...') calls if key exists in en.json
  let match;
  while ((match = tRegex.exec(content)) !== null) {
    const key = match[1];
    if (!en[key]) {
      missingKeysInEn.add(key);
    }
  }

  // 2. Check for hardcoded JSX text or attributes
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.trim().startsWith('//') || line.trim().startsWith('*')) return;
    
    // Remove t('...') occurrences
    let cleanLine = line.replace(/t\(\s*['"`][^'"`]*['"`]\s*\)/g, '""');
    // Remove comments
    cleanLine = cleanLine.replace(/\/\/.*$/, '');
    
    if (arabicRegex.test(cleanLine)) {
      filesWithRawArabic.push({
        file: path.relative('.', file),
        line: idx + 1,
        text: cleanLine.trim()
      });
    }
  });
});

console.log('=== Missing keys in en.json (' + missingKeysInEn.size + ') ===');
Array.from(missingKeysInEn).forEach(k => console.log('MISSING KEY:', k));

console.log('\n=== Lines with raw Arabic outside t(...) in dashboard & record-detail (' + filesWithRawArabic.length + ') ===');
const targetFiles = filesWithRawArabic.filter(f => 
  f.file.includes('dashboard') || 
  f.file.includes('record-detail') || 
  f.file.includes('admin-dashboard') ||
  f.file.includes('merchant-portal')
);

targetFiles.forEach(item => {
  console.log(item.file + ':' + item.line + ' -> ' + item.text.substring(0, 120));
});
