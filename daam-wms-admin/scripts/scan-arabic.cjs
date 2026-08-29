// scripts/scan-arabic.cjs
// Scans all TSX/TS files for Arabic text NOT inside t('...') calls
const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = [];
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory() && !f.includes('node_modules') && !f.includes('.git')) {
      files.push(...walk(full));
    } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

const arabicRe = /[\u0600-\u06FF]/;
// Remove all t('...') occurrences before checking
const tCallRe = /t\(['"`][^'"`]*['"`]\)/g;
const commentRe = /\/\/.*$/;

const files = walk('src');
const byFile = {};

for (const f of files) {
  const lines = fs.readFileSync(f, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    // Remove single-line comments
    line = line.replace(commentRe, '');
    // Remove t('...') calls
    line = line.replace(tCallRe, '__T__');
    // Check if Arabic remains
    if (arabicRe.test(line)) {
      const bn = path.basename(f);
      if (!byFile[bn]) byFile[bn] = [];
      byFile[bn].push({ lineNum: i + 1, text: lines[i].trim().substring(0, 120) });
    }
  }
}

let total = 0;
for (const [file, hits] of Object.entries(byFile)) {
  // Skip locales
  if (file.endsWith('.json')) continue;
  console.log('\n=== ' + file + ' (' + hits.length + ' hits) ===');
  hits.slice(0, 10).forEach(h => console.log('  L' + h.lineNum + ': ' + h.text));
  if (hits.length > 10) console.log('  ... and ' + (hits.length - 10) + ' more');
  total += hits.length;
}
console.log('\n\nTotal hardcoded Arabic lines: ' + total);
