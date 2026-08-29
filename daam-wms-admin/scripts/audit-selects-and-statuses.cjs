// scripts/audit-selects-and-statuses.cjs
const fs = require('fs');
const path = require('path');

const en = JSON.parse(fs.readFileSync('./src/locales/en.json', 'utf8'));

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

console.log('=== AUDITING ALL <select> ELEMENTS ACROSS THE APPLICATION ===');
files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('<select') || content.includes('<option')) {
    const lines = content.split('\n');
    lines.forEach((line, i) => {
      if (line.includes('<option') && arabicRegex.test(line)) {
        // check if it has raw arabic without t(...)
        let clean = line.replace(/t\(\s*['"`][^'"`]*['"`]\s*\)/g, '""');
        if (arabicRegex.test(clean)) {
          console.log(`[RAW OPTION] ${path.relative('.', file)}:${i+1} -> ${line.trim()}`);
        }
      }
    });
  }
});
