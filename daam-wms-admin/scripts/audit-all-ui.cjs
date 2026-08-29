// scripts/audit-all-ui.cjs
const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
const arabicRegex = /[\u0600-\u06FF]/;

const findings = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    let raw = line.trim();
    if (raw.startsWith('//') || raw.startsWith('/*') || raw.startsWith('*')) return;
    
    // Remove t('...') and t(`...`) calls
    let clean = line.replace(/t\(\s*['"`][^'"`]*['"`]\s*\)/g, '""');
    // Remove inline comments
    clean = clean.replace(/\/\/.*$/, '');
    
    if (arabicRegex.test(clean)) {
      // Check if it's a JSX tag or text or attribute
      findings.push({
        file: path.relative('.', file),
        line: idx + 1,
        text: raw
      });
    }
  });
});

console.log('Total UI lines with raw Arabic:', findings.length);
findings.forEach(f => {
  console.log(`${f.file}:${f.line} -> ${f.text.substring(0, 110)}`);
});
