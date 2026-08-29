// scripts/audit-toasts-and-shipping.cjs
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
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
const en = JSON.parse(fs.readFileSync('./src/locales/en.json', 'utf8'));

console.log('=== AUDIT ALL TOAST CALLS ===');
const missingKeysInToasts = [];
const unwrappedToasts = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('toast.') || line.includes('toast(')) {
      // Check if toast string has Arabic without t(
      const hasArabic = /[\u0600-\u06FF]/.test(line);
      if (hasArabic) {
        // Check if there is string literal in quotes that is not wrapped in t(
        const matches = line.match(/(['"`])([^'"`]*[\u0600-\u06FF]+[^'"`]*)\1/g) || [];
        matches.forEach(m => {
          const raw = m.slice(1, -1);
          const pos = line.indexOf(m);
          const before = line.slice(Math.max(0, pos - 5), pos);
          if (!before.includes('t(')) {
            unwrappedToasts.push({ file: path.relative('.', file), line: idx + 1, text: raw, full: line.trim() });
          } else {
            // Check if key is in en.json
            if (!en[raw]) {
              missingKeysInToasts.push({ file: path.relative('.', file), line: idx + 1, key: raw });
            }
          }
        });
      }
    }
  });
});

console.log('Unwrapped Toasts:', unwrappedToasts.length);
unwrappedToasts.forEach(u => console.log(`[UNWRAPPED] ${u.file}:${u.line} -> ${u.text}`));

console.log('\nMissing Keys in Toasts:', missingKeysInToasts.length);
missingKeysInToasts.forEach(m => console.log(`[MISSING KEY] ${m.file}:${m.line} -> ${m.key}`));

console.log('\n=== AUDIT ALL SHIPPING TYPES ===');
const shippingKeywords = [
  'منصة',
  'ذاتي',
  'شحن المنصة',
  'الشحن الذاتي',
  'شحن المنصة الداعمة',
  'الشحن القياسي',
  'الشحن السريع',
  'مسؤولية الشحن',
  'أرامكس (Aramex)',
  'سمسا إكسبريس (SMSA Express)',
  'دي إتش إل (DHL Express)',
  'فيديكس (FedEx)',
  'سبل - البريد السعودي (SPL)',
  'بوليصة الشحن',
  'توليد بوليصة الشحن',
  'تنزيل بوليصة الشحن',
  'طباعة بوليصة الشحن',
  'قائمة التجميع',
  'تجهيز قائمة التجميع',
  'رقم التتبع',
  'شركة الشحن',
  'نوع الشحن',
  'طريقة الشحن',
];

shippingKeywords.forEach(kw => {
  console.log(`Shipping Term: "${kw}" -> en.json: ${en[kw] ? '✅ ' + en[kw] : '❌ MISSING'}`);
});
