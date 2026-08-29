#!/usr/bin/env node

/**
 * سكربت فحص وتدقيق الترجمة والنصوص الثابتة في المكونات (UI i18n Audit & Sync)
 * ----------------------------------------------------------------------------
 * 1. فحص مجلد src/features و src/components لاستخراج أي نصوص عربية ثابتة في الـ JSX لم تُغلَف بدالة t('...')
 * 2. فحص ومقارنة ملفات الترجمة ar.json و en.json للتأكد من تطابق المفاتيح بنسبة 100%.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const AR_JSON_PATH = path.join(SRC_DIR, 'locales/ar.json');
const EN_JSON_PATH = path.join(SRC_DIR, 'locales/en.json');

// استعراض ملفات واجهات المستخدم (Features, Components, App)
function getUIFiles(dir) {
  let files = [];
  const list = fs.readdirSync(dir);
  for (const item of list) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!['node_modules', 'dist', 'services', 'types'].includes(item)) {
        files = files.concat(getUIFiles(fullPath));
      }
    } else if (/\.(tsx|jsx)$/.test(item) && !item.endsWith('.d.ts')) {
      files.push(fullPath);
    }
  }
  return files;
}

console.log('\n=============================================================');
console.log(' 🔍 بدأ الفحص الشامل لمكونات واجهة المستخدم (UI Components)');
console.log('=============================================================\n');

const uiFiles = getUIFiles(SRC_DIR);
const ARABIC_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/;

const hardcodedInUI = [];
const usedKeysInCode = new Set();

uiFiles.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  const relPath = path.relative(ROOT_DIR, filePath);

  lines.forEach((line, lineIdx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*') || trimmed.startsWith('import ')) {
      return;
    }

    // استخراج المفاتيح المستخدمة في t(...)
    const tRegex = /\bt\(\s*(['"`])((?:\\.|[^\\])*?)\1\s*\)/g;
    let tMatch;
    while ((tMatch = tRegex.exec(line)) !== null) {
      if (tMatch[2] && !tMatch[2].includes('\n')) {
        usedKeysInCode.add(tMatch[2]);
      }
    }

    // فحص النصوص العربية خارج t(...)
    if (ARABIC_REGEX.test(line)) {
      const lineWithoutT = line.replace(/\bt\(\s*(['"`])(?:\\.|[^\\])*?\1\s*\)/g, '');
      if (ARABIC_REGEX.test(lineWithoutT)) {
        hardcodedInUI.push({
          file: relPath,
          line: lineIdx + 1,
          content: trimmed
        });
      }
    }
  });
});

console.log('-------------------------------------------------------------');
console.log(`📌 1. تقرير النصوص الثابتة غير المغلفة بدالة t(...) في الـ JSX [العدد: ${hardcodedInUI.length}]`);
console.log('-------------------------------------------------------------');

if (hardcodedInUI.length === 0) {
  console.log('✅ ممتاز! تم تعريب 100% من مكونات الـ JSX ولا توجد أي نصوص عربية خارج دالة t(...).');
} else {
  hardcodedInUI.forEach((item, idx) => {
    console.log(`\n[${idx + 1}] 📁 الملف: ${item.file}:${item.line}`);
    console.log(`   السطر: ${item.content}`);
  });
}

console.log('\n-------------------------------------------------------------');
console.log('📌 2. فحص وتدقيق ملفات الترجمة (ar.json vs en.json)');
console.log('-------------------------------------------------------------');

let arJson = {}, enJson = {};
try { arJson = JSON.parse(fs.readFileSync(AR_JSON_PATH, 'utf8')); } catch (e) {}
try { enJson = JSON.parse(fs.readFileSync(EN_JSON_PATH, 'utf8')); } catch (e) {}

const arKeys = Object.keys(arJson);
const enKeys = Object.keys(enJson);

const missingInEn = arKeys.filter(k => !(k in enJson) || !enJson[k]);
const missingInAr = enKeys.filter(k => !(k in arJson) || !arJson[k]);

console.log(`📊 إجمالي المفاتيح في ar.json: ${arKeys.length}`);
console.log(`📊 إجمالي المفاتيح في en.json: ${enKeys.length}`);
console.log(`📊 مفاتيح مستخدمة في الكود: ${usedKeysInCode.size}`);

if (missingInEn.length === 0 && missingInAr.length === 0) {
  console.log('✅ تطابق كامل 100% بين ملفات الترجمة (ar.json و en.json) دون أي مفاتيح ناقصة.');
} else {
  if (missingInEn.length > 0) {
    console.log(`⚠️ مفاتيح ناقصة في en.json [العدد: ${missingInEn.length}]:`);
    missingInEn.slice(0, 10).forEach(k => console.log(`   - "${k}"`));
  }
  if (missingInAr.length > 0) {
    console.log(`⚠️ مفاتيح ناقصة في ar.json [العدد: ${missingInAr.length}]:`);
    missingInAr.slice(0, 10).forEach(k => console.log(`   - "${k}"`));
  }
}

console.log('\n=============================================================');
console.log(' 🎉 اكتمل الفحص والتدقيق بنجاح!');
console.log('=============================================================\n');
