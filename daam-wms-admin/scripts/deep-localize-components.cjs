const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  replacements.forEach(([from, to]) => {
    if (content.includes(from)) {
      content = content.split(from).join(to);
      changed = true;
    }
  });
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Updated:', path.relative(process.cwd(), filePath));
  }
}

// 1. Inventory Pages
replaceInFile(path.join(__dirname, '../src/features/inventory/inventory-pages.tsx'), [
  ["{ accessorKey: 'm', header: t('التاجر') },", "{ id: 'm', header: t('التاجر'), cell: ({ row }) => t(row.original.m) },"],
  ["{ accessorKey: 'p', header: t('المنتج') },", "{ id: 'p', header: t('المنتج'), cell: ({ row }) => t(row.original.p) },"],
  ["{ accessorKey: 'wh', header: t('المستودع') },", "{ id: 'wh', header: t('المستودع'), cell: ({ row }) => t(row.original.wh) },"],
  ["{ accessorKey: 'p', header: t('المنتج'), cell: ({ row }) => <b>{row.original.p}</b> },", "{ id: 'p', header: t('المنتج'), cell: ({ row }) => <b>{t(row.original.p)}</b> },"],
  ["{(opts?.products ?? []).map(p => <option key={p} value={p}>{p}</option>)}", "{(opts?.products ?? []).map(p => <option key={p} value={p}>{t(p)}</option>)}"],
  ["{ accessorKey: 'store', header: t('المتجر') },", "{ id: 'store', header: t('المتجر'), cell: ({ row }) => t(row.original.store) },"],
]);

// 2. Returns Page
replaceInFile(path.join(__dirname, '../src/features/returns/returns-page.tsx'), [
  ["{ accessorKey: 'm', header: t('التاجر') },", "{ id: 'm', header: t('التاجر'), cell: ({ row }) => t(row.original.m) },"],
  ["{ accessorKey: 'reason', header: t('السبب') },", "{ id: 'reason', header: t('السبب'), cell: ({ row }) => t(row.original.reason) },"],
]);

// 3. Finance Pages
replaceInFile(path.join(__dirname, '../src/features/finance/finance-pages.tsx'), [
  ["{ accessorKey: 'm', header: t('التاجر') },", "{ id: 'm', header: t('التاجر'), cell: ({ row }) => t(row.original.m) },"],
  ["{ accessorKey: 'store', header: t('المتجر') },", "{ id: 'store', header: t('المتجر'), cell: ({ row }) => t(row.original.store) },"],
  ["{ accessorKey: 'bank', header: t('البنك') },", "{ id: 'bank', header: t('البنك'), cell: ({ row }) => t(row.original.bank) },"],
  ["{ accessorKey: 'period', header: t('الفترة') },", "{ id: 'period', header: t('الفترة'), cell: ({ row }) => t(row.original.period) },"],
]);

// 4. Services Pages
replaceInFile(path.join(__dirname, '../src/features/services/services-pages.tsx'), [
  ["{ accessorKey: 'm', header: t('التاجر') },", "{ id: 'm', header: t('التاجر'), cell: ({ row }) => t(row.original.m) },"],
  ["{ accessorKey: 'srv', header: t('الخدمة') },", "{ id: 'srv', header: t('الخدمة'), cell: ({ row }) => t(row.original.srv) },"],
  ["{ accessorKey: 'name', header: t('اسم الخدمة') },", "{ id: 'name', header: t('اسم الخدمة'), cell: ({ row }) => t(row.original.name) },"],
  ["{ accessorKey: 'freq', header: t('الدورية') },", "{ id: 'freq', header: t('الدورية'), cell: ({ row }) => t(row.original.freq) },"],
  ["{ accessorKey: 'unit', header: t('الوحدة') },", "{ id: 'unit', header: t('الوحدة'), cell: ({ row }) => t(row.original.unit) },"],
]);

// 5. Merchant Inventory Page
replaceInFile(path.join(__dirname, '../src/features/merchant/merchant-inventory-page.tsx'), [
  ["{ accessorKey: 'p', header: t('المنتج') },", "{ id: 'p', header: t('المنتج'), cell: ({ row }) => t(row.original.p) },"],
  ["{ accessorKey: 'wh', header: t('المستودع') },", "{ id: 'wh', header: t('المستودع'), cell: ({ row }) => t(row.original.wh) },"],
  ["{ accessorKey: 'p', header: t('المنتج'), cell: ({ row }) => <b>{row.original.p}</b> },", "{ id: 'p', header: t('المنتج'), cell: ({ row }) => <b>{t(row.original.p)}</b> },"],
]);

// 6. Merchant Products Page
replaceInFile(path.join(__dirname, '../src/features/merchant/merchant-products-page.tsx'), [
  ["{ accessorKey: 'name', header: t('اسم المنتج') },", "{ id: 'name', header: t('اسم المنتج'), cell: ({ row }) => t(row.original.name) },"],
]);

// 7. Merchant Returns Page
replaceInFile(path.join(__dirname, '../src/features/merchant/merchant-returns-page.tsx'), [
  ["{ accessorKey: 'reason', header: t('السبب') },", "{ id: 'reason', header: t('السبب'), cell: ({ row }) => t(row.original.reason) },"],
  ["{ accessorKey: 'p', header: t('المنتج') },", "{ id: 'p', header: t('المنتج'), cell: ({ row }) => t(row.original.p) },"],
]);

// 8. Merchant Services Page
replaceInFile(path.join(__dirname, '../src/features/merchant/merchant-services-page.tsx'), [
  ["{ accessorKey: 'srv', header: t('الخدمة') },", "{ id: 'srv', header: t('الخدمة'), cell: ({ row }) => t(row.original.srv) },"],
  ["{ accessorKey: 'freq', header: t('الدورية') },", "{ id: 'freq', header: t('الدورية'), cell: ({ row }) => t(row.original.freq) },"],
]);

// 9. Merchant Wallet Page
replaceInFile(path.join(__dirname, '../src/features/merchant/merchant-wallet-page.tsx'), [
  ["{ accessorKey: 'bank', header: t('البنك') },", "{ id: 'bank', header: t('البنك'), cell: ({ row }) => t(row.original.bank) },"],
  ["{ accessorKey: 'desc', header: t('الوصف') },", "{ id: 'desc', header: t('الوصف'), cell: ({ row }) => t(row.original.desc) },"],
  ["{ accessorKey: 'period', header: t('الفترة') },", "{ id: 'period', header: t('الفترة'), cell: ({ row }) => t(row.original.period) },"],
]);

// 10. Platform Products Page
replaceInFile(path.join(__dirname, '../src/features/products/platform-products-page.tsx'), [
  ["{ accessorKey: 'name', header: t('اسم المنتج') },", "{ id: 'name', header: t('اسم المنتج'), cell: ({ row }) => t(row.original.name) },"],
  ["{ accessorKey: 'desc', header: t('الوصف') },", "{ id: 'desc', header: t('الوصف'), cell: ({ row }) => t(row.original.desc) },"],
]);

console.log('Finished deep localizing all component cells!');
