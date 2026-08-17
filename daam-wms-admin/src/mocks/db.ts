// src/mocks/db.ts
import type {
  Admin, Merchant, PlatformProduct, StockRequest, StockLevel,
  Order, ReturnRequest, Withdrawal, Wallet, Invoice, ServiceType,
  ServiceRequest, Subscription, Approval, AppNotification, NotifEvent, AuditLog,
} from '@/types'

export const db = {
  admins: [
    { id: 'A-001', email: 'admin@daam.sa', pwd: 'Admin@123', name: 'عبدالله السالم', role: 'مدير النظام', dept: 'تقنية المعلومات', phone: '0555010203', gender: 'ذكر' },
  ] as Admin[],

  merchants: [
    { id: 'M-001', store: 'متجر البن الذهبي', first: 'عبدالله', last: 'الحربي', email: 'abdullah@goldenbean.sa', phone: '0551234567', status: 'نشط', join: 'منضم', created: '2025-06-14', gender: 'ذكر', bank: 'مصرف الراجحي', iban: 'SA4420000001234567891234', natId: '1087654321123', natAddr: 'RKBD1024', limit: 120, used: 96, unit: 'م³', attachments: ['license_001.pdf', 'business_permit_001.jpg'] },
    { id: 'M-002', store: 'متجر النقاء للتنظيف', first: 'سارة', last: 'القحطاني', email: 'sara@naqaa.sa', phone: '0552345678', status: 'نشط', join: 'منضم', created: '2025-08-02', gender: 'أنثى', bank: 'البنك الأهلي السعودي', iban: 'SA1210000002234567891234', natId: '1098765432111', natAddr: 'NQAE2044', limit: 80, used: 71, unit: 'م³', attachments: ['registration_002.pdf'] },
    { id: 'M-003', store: 'متجر لمسة العناية', first: 'نورة', last: 'الشمري', email: 'noura@lamsa.sa', phone: '0553456789', status: 'نشط', join: 'غير منضم بعد', created: '2026-01-18', gender: 'أنثى', bank: 'بنك الرياض', iban: 'SA2320000003234567891234', natId: '1102233445566', natAddr: 'LMSA3055', limit: 60, used: 0, unit: 'م³' },
    { id: 'M-004', store: 'مؤسسة ركن القهوة', first: 'محمد', last: 'العتيبي', email: 'mohammed@rukncoffee.sa', phone: '0554567890', status: 'نشط', join: 'منضم', created: '2025-04-22', gender: 'ذكر', bank: 'بنك الإنماء', iban: 'SA3305000004234567891234', natId: '1076655443322', natAddr: 'RKNC4066', limit: 150, used: 150, unit: 'م³', attachments: ['tax_certificate_004.pdf', 'office_photo_004.jpg', 'warehouse_inspection_004.jpg'] },
    { id: 'M-005', store: 'متجر أصول النظافة', first: 'خالد', last: 'الدوسري', email: 'khaled@osool.sa', phone: '0555678901', status: 'موقوف', join: 'منضم', created: '2025-10-09', gender: 'ذكر', bank: 'مصرف الراجحي', iban: 'SA4420000005234567891234', natId: '1065544332211', natAddr: 'OSOL5077', limit: 100, used: 44, unit: 'م³' },
    { id: 'M-006', store: 'متجر الجمال الحديث', first: 'ريم', last: 'الزهراني', email: 'reem@modernbeauty.sa', phone: '0556789012', status: 'نشط', join: 'منضم', created: '2025-11-30', gender: 'أنثى', bank: 'بنك ساب', iban: 'SA5545000006234567891234', natId: '1111222333444', natAddr: 'JMAL6088', limit: 70, used: 58, unit: 'م³', attachments: ['merchant_agreement_006.pdf'] },
    { id: 'M-007', store: 'متجر انتعاش', first: 'فهد', last: 'المطيري', email: 'fahad@int3ash.sa', phone: '0557890123', status: 'نشط', join: 'غير منضم بعد', created: '2026-02-01', gender: 'ذكر', bank: 'البنك الأول', iban: 'SA6660000007234567891234', natId: '1122334455667', natAddr: 'INTA7099', limit: 50, used: 0, unit: 'م³' },
    { id: 'M-008', store: 'متجر قهوة المختصين', first: 'هند', last: 'العنزي', email: 'hind@specialty.sa', phone: '0558901234', status: 'نشط', join: 'منضم', created: '2025-12-15', gender: 'أنثى', bank: 'بنك البلاد', iban: 'SA7799000008234567891234', natId: '1133445566778', natAddr: 'QHWA8100', limit: 90, used: 33, unit: 'م³', attachments: ['quality_cert_008.pdf', 'supplier_docs_008.jpg'] },
  ] as Merchant[],

  pltProducts: [
    { ref: 'PLT-001', name: 'عبوة شحن قياسية', desc: 'عبوة كرتونية مقواة بأحجام موحدة معتمدة من المنصة', status: 'نشط', created: '2025-09-10', linked: false },
    { ref: 'PLT-002', name: 'ملصقات تعريفية', desc: 'رولات ملصقات حرارية بشعار المنصة', status: 'نشط', created: '2025-09-10', linked: false },
    { ref: 'PLT-003', name: 'صندوق هدايا المنصة', desc: 'صندوق تغليف فاخر مع شريط وشعار الدعم الرائدة', status: 'نشط', created: '2025-11-05', linked: true },
    { ref: 'PLT-004', name: 'بطاقة إهداء رقمية', desc: 'بطاقة إهداء رقمية غير مخزنة تُضاف للطلبات مباشرة', status: 'غير نشط', created: '2026-01-12', linked: false },
  ] as PlatformProduct[],

  warehouses: ['مستودع الرياض الرئيسي', 'مستودع جدة', 'مستودع الدمام'],

  stockLevels: [
    { p: 'قهوة عربية مختصة 1كجم', sku: 'COF-1001', wh: 'مستودع الرياض الرئيسي', avail: 320, res: 45 },
    { p: 'بن محمص كولومبي 500جم', sku: 'COF-1002', wh: 'مستودع الرياض الرئيسي', avail: 180, res: 22 },
    { p: 'منظف أرضيات معطر 3لتر', sku: 'CLN-2001', wh: 'مستودع جدة', avail: 540, res: 60 },
    { p: 'سائل غسيل الصحون 1لتر', sku: 'CLN-2002', wh: 'مستودع جدة', avail: 95, res: 18 },
    { p: 'شامبو طبيعي بالأعشاب', sku: 'CAR-3001', wh: 'مستودع الرياض الرئيسي', avail: 210, res: 12 },
    { p: 'صابون سائل لليدين', sku: 'CAR-3002', wh: 'مستودع الدمام', avail: 48, res: 9 },
    { p: 'معقم أسطح متعدد الاستخدام', sku: 'CLN-2003', wh: 'مستودع الدمام', avail: 26, res: 4 },
    { p: 'قهوة تركية فاخرة 250جم', sku: 'COF-1003', wh: 'مستودع الرياض الرئيسي', avail: 390, res: 71 },
    { p: 'منعم أقمشة مركّز', sku: 'CLN-2004', wh: 'مستودع جدة', avail: 130, res: 25 },
    { p: 'لوشن عناية بالجسم', sku: 'CAR-3003', wh: 'مستودع الدمام', avail: 18, res: 6 },
  ] as StockLevel[],

  stockRequests: [
    { id: 'SR-1001', m: 'متجر البن الذهبي', date: '2026-02-08', type: 'إضافة', qty: 200, p: 'قهوة عربية مختصة 1كجم', wh: 'مستودع الرياض الرئيسي', status: 'معلق', notes: 'يرجى الفحص والتأكد من سلامة الأكياس المعبأة كليا من البن والتحقق من الوزن الإجمالي.', attachment: 'invoice_and_manifest_1001.pdf' },
    { id: 'SR-1002', m: 'متجر النقاء للتنظيف', date: '2026-02-08', type: 'إضافة', qty: 500, p: 'منظف أرضيات معطر 3لتر', wh: 'مستودع جدة', status: 'معلق', notes: 'شحنة منظفات إضافية لتغطية الطلب المتزايد في المنطقة الغربية.' },
    { id: 'SR-1003', m: 'مؤسسة ركن القهوة', date: '2026-02-07', type: 'سحب', qty: 120, p: 'قهوة تركية فاخرة 250جم', wh: 'مستودع الرياض الرئيسي', status: 'معلق', notes: 'سحب جزئي مؤقت للتوصيل المباشر لمعرض الرياض الدولي للقهوة.' },
    { id: 'SR-1004', m: 'متجر الجمال الحديث', date: '2026-02-06', type: 'سحب', qty: 40, p: 'لوشن عناية بالجسم', wh: 'مستودع الدمام', status: 'معلق' },
    { id: 'SR-1005', m: 'متجر قهوة المختصين', date: '2026-02-06', type: 'إضافة', qty: 80, p: 'بن محمص كولومبي 500جم', wh: 'مستودع الرياض الرئيسي', status: 'معلق', notes: 'إضافة مخزون عاجلة مع بوليصة توريد مرفقة.', attachment: 'packing_slip_80_qty.png' },
  ] as StockRequest[],

  orders: [
    { id: 'ORD-7001', m: 'متجر البن الذهبي', date: '2026-02-10', status: 'معلق', items: 3, total: 412.5, ship: 'منصة', cust: 'أحمد الغامدي' },
    { id: 'ORD-7002', m: 'متجر النقاء للتنظيف', date: '2026-02-10', status: 'قيد المعالجة', items: 5, total: 189, ship: 'منصة', cust: 'لطيفة الحسن' },
    { id: 'ORD-7003', m: 'مؤسسة ركن القهوة', date: '2026-02-09', status: 'مكتمل', items: 2, total: 240, ship: 'ذاتي', cust: 'سلطان الرشيد', attachments: ['waybill_7003.pdf'] },
    { id: 'ORD-7004', m: 'متجر لمسة العناية', date: '2026-02-09', status: 'معلق', items: 1, total: 75, ship: 'منصة', cust: 'منيرة العبدالله' },
    { id: 'ORD-7005', m: 'متجر الجمال الحديث', date: '2026-02-08', status: 'قيد المعالجة', items: 4, total: 560, ship: 'ذاتي', cust: 'جواهر السبيعي', attachments: ['shipment_label_7005.jpg', 'tracking_7005.txt'] },
    { id: 'ORD-7006', m: 'متجر البن الذهبي', date: '2026-02-08', status: 'مكتمل', items: 6, total: 830, ship: 'منصة', cust: 'ناصر الشهراني' },
    { id: 'ORD-7007', m: 'متجر قهوة المختصين', date: '2026-02-07', status: 'ملغي', items: 2, total: 120, ship: 'منصة', cust: 'عائشة المالكي' },
    { id: 'ORD-7008', m: 'متجر النقاء للتنظيف', date: '2026-02-07', status: 'مكتمل', items: 3, total: 95.5, ship: 'منصة', cust: 'تركي الحمد' },
    { id: 'ORD-7009', m: 'متجر أصول النظافة', date: '2026-02-06', status: 'معلق', items: 8, total: 1240, ship: 'ذاتي', cust: 'دانة الخالدي', attachments: ['waybill_7009.pdf', 'insurance_doc_7009.pdf'] },
    { id: 'ORD-7010', m: 'مؤسسة ركن القهوة', date: '2026-02-05', status: 'قيد المعالجة', items: 2, total: 310, ship: 'منصة', cust: 'بدر القرني' },
  ] as Order[],

  returns: [
    { ref: 'RET-2001', m: 'متجر البن الذهبي', email: 'abdullah@goldenbean.sa', order: 'ORD-7006', cust: 'ناصر الشهراني', count: 1, type: 'إرجاع للمخزون', date: '2026-02-09', status: 'معلق', notes: 'يرجى التحقق من سلامة المنتج قبل إعادة إدخاله للمخزون.', attachment: 'return_audit_2001.pdf' },
    { ref: 'RET-2002', m: 'متجر النقاء للتنظيف', email: 'sara@naqaa.sa', order: 'ORD-7008', cust: 'تركي الحمد', count: 2, type: 'إرجاع للتاجر', date: '2026-02-09', status: 'معلق', notes: 'المنتجات مصنَّعة حسب الطلب، نحتاج مراجعة قبل إعادة التوريد.', attachment: 'seller_return_notes_2002.pdf' },
    { ref: 'RET-2003', m: 'متجر الجمال الحديث', email: 'reem@modernbeauty.sa', order: 'ORD-7005', cust: 'جواهر السبيعي', count: 1, type: 'إتلاف', date: '2026-02-08', status: 'معلق', notes: 'المنتج تالف أثناء التشغيل، يُطلب إتلافه وفق الإرشادات.', attachment: 'damage_report_2003.jpg' },
    { ref: 'RET-2004', m: 'مؤسسة ركن القهوة', email: 'mohammed@rukncoffee.sa', order: 'ORD-7003', cust: 'سلطان الرشيد', count: 3, type: 'إرجاع للمخزون', date: '2026-02-06', status: 'معتمد', notes: 'تم فحص المنتجات ووضعها في دورة الاستلام.', attachment: 'return_checklist_2004.pdf' },
    { ref: 'RET-2005', m: 'متجر البن الذهبي', email: 'abdullah@goldenbean.sa', order: 'ORD-7001', cust: 'أحمد الغامدي', count: 1, type: 'إرجاع للمخزون', date: '2026-02-05', status: 'في الطريق', notes: 'المتجر قام بتغليف المنتج بطريقة مناسبة للتوصيل.', attachment: 'shipping_label_2005.pdf' },
    { ref: 'RET-2006', m: 'متجر النقاء للتنظيف', email: 'sara@naqaa.sa', order: 'ORD-7002', cust: 'لطيفة الحسن', count: 2, type: 'إرجاع للتاجر', date: '2026-02-03', status: 'مستلم', notes: 'استلام المنتج من العميل تم في نفس اليوم.', attachment: 'receive_receipt_2006.png' },
    { ref: 'RET-2007', m: 'متجر قهوة المختصين', email: 'hind@specialty.sa', order: 'ORD-7007', cust: 'عائشة المالكي', count: 1, type: 'إرجاع للمخزون', date: '2026-02-01', status: 'تم الفحص', notes: 'تقرير الفحص جاهز، المنتج مناسب للإعادة إلى المخزون.', attachment: 'inspection_report_2007.pdf' },
    { ref: 'RET-2008', m: 'متجر أصول النظافة', email: 'khaled@osool.sa', order: 'ORD-7009', cust: 'دانة الخالدي', count: 4, type: 'إرجاع للمخزون', date: '2026-01-28', status: 'تم الاسترداد', notes: 'تم إرجاع المبالغ إلى رصيد المحفظة.', attachment: 'refund_receipt_2008.pdf' },
  ] as ReturnRequest[],

  withdrawals: [
    { id: 'WD-3001', m: 'متجر البن الذهبي', email: 'abdullah@goldenbean.sa', amount: 4500, method: 'تحويل بنكي', bank: '•••• 4321', date: '2026-02-09', status: 'معلق', notes: 'مبلغ السحب مرتبط بشحنة قهوة جديدة ومستلزمات التعبئة.', attachment: 'bank_transfer_proof_3001.pdf' },
    { id: 'WD-3002', m: 'متجر النقاء للتنظيف', email: 'sara@naqaa.sa', amount: 2150.75, method: 'تحويل بنكي', bank: '•••• 8810', date: '2026-02-09', status: 'معلق', notes: 'السحب مخصص لتجديد المخزون في جدة.', attachment: 'withdrawal_invoice_3002.pdf' },
    { id: 'WD-3003', m: 'مؤسسة ركن القهوة', email: 'mohammed@rukncoffee.sa', amount: 7800, method: 'تحويل بنكي', bank: '•••• 1290', date: '2026-02-08', status: 'معلق', notes: 'طلب سحب عاجل لتمويل شحنة القهوة القادمة.', attachment: 'payment_request_3003.pdf' },
    { id: 'WD-3004', m: 'متجر الجمال الحديث', email: 'reem@modernbeauty.sa', amount: 960, method: 'رصيد المحفظة', bank: '—', date: '2026-02-07', status: 'معتمد', notes: 'تم اعتماد السحب إلى رصيد المحفظة.', attachment: 'wallet_credit_3004.pdf' },
    { id: 'WD-3005', m: 'متجر قهوة المختصين', email: 'hind@specialty.sa', amount: 3300, method: 'تحويل بنكي', bank: '•••• 5544', date: '2026-02-06', status: 'قيد التنفيذ', notes: 'التحويل قيد التنفيذ خلال اليوم التالي.', attachment: 'transfer_tracking_3005.pdf' },
  ] as Withdrawal[],

  wallets: [
    { m: 'متجر البن الذهبي', email: 'abdullah@goldenbean.sa', bal: 12400.5, res: 4500, credits: 98200, debits: 61300, last: '2026-02-09', status: 'نشط' },
    { m: 'متجر النقاء للتنظيف', email: 'sara@naqaa.sa', bal: 5210.25, res: 2150.75, credits: 44100, debits: 31000, last: '2026-02-09', status: 'نشط' },
    { m: 'مؤسسة ركن القهوة', email: 'mohammed@rukncoffee.sa', bal: 18750, res: 7800, credits: 120500, debits: 88900, last: '2026-02-08', status: 'نشط' },
    { m: 'متجر لمسة العناية', email: 'noura@lamsa.sa', bal: 0, res: 0, credits: 0, debits: 0, last: '—', status: 'نشط' },
    { m: 'متجر أصول النظافة', email: 'khaled@osool.sa', bal: -240, res: 0, credits: 15300, debits: 15540, last: '2026-01-30', status: 'مجمّد' },
    { m: 'متجر الجمال الحديث', email: 'reem@modernbeauty.sa', bal: 3480.75, res: 960, credits: 27800, debits: 19400, last: '2026-02-07', status: 'نشط' },
    { m: 'متجر قهوة المختصين', email: 'hind@specialty.sa', bal: 8920, res: 3300, credits: 35600, debits: 23100, last: '2026-02-06', status: 'نشط' },
    { m: 'متجر انتعاش', email: 'fahad@int3ash.sa', bal: 150, res: 0, credits: 150, debits: 0, last: '2026-02-01', status: 'موقوف' },
  ] as Wallet[],

  invoices: [
    { ref: 'INV-M-202601-001', m: 'متجر البن الذهبي', email: 'abdullah@goldenbean.sa', period: 'يناير 2026', total: 2840, status: 'مرسلة', due: '2026-02-15', gen: '2026-02-01', sent: '2026-02-01' },
    { ref: 'INV-M-202601-002', m: 'متجر النقاء للتنظيف', email: 'sara@naqaa.sa', period: 'يناير 2026', total: 1930.5, status: 'مدفوعة', due: '2026-02-15', gen: '2026-02-01', sent: '2026-02-01' },
    { ref: 'INV-M-202601-003', m: 'مؤسسة ركن القهوة', email: 'mohammed@rukncoffee.sa', period: 'يناير 2026', total: 4120.75, status: 'متأخرة', due: '2026-02-10', gen: '2026-02-01', sent: '2026-02-01' },
    { ref: 'INV-M-202601-004', m: 'متجر الجمال الحديث', email: 'reem@modernbeauty.sa', period: 'يناير 2026', total: 760.25, status: 'مستعرضة', due: '2026-02-15', gen: '2026-02-01', sent: '2026-02-01' },
    { ref: 'INV-M-202601-005', m: 'متجر قهوة المختصين', email: 'hind@specialty.sa', period: 'يناير 2026', total: 1450, status: 'تم الإنشاء', due: '2026-02-15', gen: '2026-02-01', sent: '—' },
  ] as Invoice[],

  serviceTypes: [
    { name: 'تغليف المنتجات', desc: 'خدمة تغليف وتعبئة المنتجات حسب معايير المنصة', cost: 2.5, unit: 'لكل قطعة', prod: 'نعم', status: 'نشط', model: 'دفعة واحدة', freq: '—' },
    { name: 'التخزين المبرد', desc: 'تخزين المنتجات الحساسة في غرف مبردة', cost: 350, unit: 'لكل طلب', prod: 'لا', status: 'نشط', model: 'متكرر', freq: 'شهري' },
    { name: 'وضع الملصقات', desc: 'طباعة ووضع الملصقات التعريفية', cost: 1.25, unit: 'لكل قطعة', prod: 'نعم', status: 'نشط', model: 'دفعة واحدة', freq: '—' },
    { name: 'تصوير المنتجات', desc: 'تصوير احترافي للمنتجات', cost: 15, unit: 'لكل منتج', prod: 'نعم', status: 'نشط', model: 'دفعة واحدة', freq: '—' },
    { name: 'إدارة الإرجاع الشاملة', desc: 'استقبال وفحص ومعالجة مرتجعات المتجر', cost: 600, unit: 'لكل طلب', prod: 'لا', status: 'نشط', model: 'متكرر', freq: 'ربع سنوي' },
  ] as ServiceType[],

  serviceRequests: [
    { ref: 'SRV-4001', m: 'متجر البن الذهبي', email: 'abdullah@goldenbean.sa', type: 'تغليف المنتجات', prod: 'قهوة عربية', qty: 200, cost: 500, urgency: 'عادي', date: '2026-02-14', req: '2026-02-08', status: 'معلق', notes: 'يرجى تغليف القطع في أرقام مخصصة حسب الطلبات المميزة.', attachment: 'packaging_spec_4001.pdf' },
    { ref: 'SRV-4002', m: 'متجر النقاء للتنظيف', email: 'sara@naqaa.sa', type: 'التخزين المبرد', prod: '—', qty: 1, cost: 350, urgency: 'عاجل', date: '2026-02-12', req: '2026-02-08', status: 'معلق', notes: 'الطلب يحتاج خدمة فورية بسبب زيادة الطلب في المنطقة الغربية.', attachment: 'cold_storage_request_4002.pdf' },
    { ref: 'SRV-4003', m: 'مؤسسة ركن القهوة', email: 'mohammed@rukncoffee.sa', type: 'وضع الملصقات', prod: 'قهوة تركية', qty: 500, cost: 625, urgency: 'حرج', date: '2026-02-11', req: '2026-02-07', status: 'معلق', notes: 'مجموعة ملصقات احتياج لعرض فعلي في معرض الرياض.', attachment: 'label_placement_4003.png' },
  ] as ServiceRequest[],

  subscriptions: [
    { id: 'SUB-5001', m: 'متجر قهوة المختصين', type: 'إدارة الإرجاع الشاملة', cost: 600, freq: 'ربع سنوي', next: '2026-05-05', status: 'نشط', total: 600, start: '2026-02-05' },
    { id: 'SUB-5002', m: 'متجر البن الذهبي', type: 'التخزين المبرد', cost: 350, freq: 'شهري', next: '2026-03-01', status: 'نشط', total: 2100, start: '2025-09-01' },
    { id: 'SUB-5003', m: 'متجر النقاء للتنظيف', type: 'التخزين المبرد', cost: 350, freq: 'شهري', next: '2026-02-15', status: 'فشل الدفع', total: 1750, start: '2025-08-15' },
  ] as Subscription[],

  approvals: [
    { id: 'APR-9001', type: 'تأهيل تاجر', urgency: 'عادي', who: 'متجر انتعاش', title: 'طلب تأهيل تاجر جديد — متجر انتعاش', date: '2026-02-09', days: 1 },
    { id: 'APR-9002', type: 'إضافة مخزون', urgency: 'عادي', who: 'متجر البن الذهبي', title: 'إضافة 200 قطعة — قهوة عربية مختصة', date: '2026-02-08', days: 2, qty: 200 },
    { id: 'APR-9003', type: 'سحب مخزون', urgency: 'عاجل', who: 'مؤسسة ركن القهوة', title: 'سحب 120 قطعة — قهوة تركية فاخرة', date: '2026-02-07', days: 3, qty: 120 },
    { id: 'APR-9004', type: 'طلب إرجاع', urgency: 'عادي', who: 'متجر الجمال الحديث', title: 'إرجاع RET-2003 — إتلاف منتج تالف', date: '2026-02-08', days: 2 },
    { id: 'APR-9005', type: 'طلب سحب مالي', urgency: 'حرج', who: 'مؤسسة ركن القهوة', title: 'سحب 7,800.00 ر.س — تحويل بنكي', date: '2026-02-08', days: 4 },
  ] as Approval[],

  notifEvents: [
    { name: 'تحديث حالة الطلب', email: true, app: true, sms: false, tpl: 'قالب إشعار حالة الطلب' },
    { name: 'اعتماد طلب المخزون', email: true, app: true, sms: false, tpl: 'قالب اعتماد المخزون' },
    { name: 'رفض طلب المخزون', email: true, app: true, sms: false, tpl: 'قالب رفض الطلبات' },
  ] as NotifEvent[],

  notifications: [
    { id: 'N1', title: 'موافقة معلقة جديدة', msg: 'طلب سحب مالي حرج APR-9005 من مؤسسة ركن القهوة بانتظار المراجعة منذ 4 أيام', type: 'موافقة', icon: 'shield', color: 'purple', time: 'قبل 5 دقائق', unread: true },
    { id: 'N2', title: 'تنبيه تجاوز حد التخزين', msg: 'تجاوز متجر مؤسسة ركن القهوة حد التخزين المجاني (100%)', type: 'تحذير', icon: 'alert', color: 'orange', time: 'قبل 20 دقيقة', unread: true },
    { id: 'N3', title: 'طلب مرتجع جديد', msg: 'RET-2003 من متجر الجمال الحديث — نوع الإرجاع: إتلاف', type: 'تنبيه', icon: 'undo', color: 'blue', time: 'قبل ساعة', unread: true },
    { id: 'N4', title: 'فشل دفع اشتراك', msg: 'تعذر خصم رسوم اشتراك التخزين المبرد لمتجر النقاء للتنظيف', type: 'تحذير', icon: 'wallet', color: 'red', time: 'قبل ساعتين', unread: false },
    { id: 'N5', title: 'اكتمال طلب خدمة', msg: 'اكتمل طلب الخدمة SRV-4006 لمتجر أصول النظافة', type: 'نجاح', icon: 'check', color: 'green', time: 'أمس', unread: false },
  ] as AppNotification[],

  logs: [
    { id: 'LOG-098', type: 'دخول', actor: 'عبدالله السالم', role: 'مدير النظام', email: 'admin@daam.sa', desc: 'تسجيل دخول ناجح إلى لوحة التحكم', entity: 'المصادقة', time: '2026-02-10 08:02', ip: '10.20.4.18' },
    { id: 'LOG-097', type: 'اعتماد', actor: 'عبدالله السالم', role: 'مدير النظام', email: 'admin@daam.sa', desc: 'اعتماد طلب المخزون SR-0998 (+150 قطعة)', entity: 'SR-0998', time: '2026-02-09 14:22', ip: '10.20.4.18' },
    { id: 'LOG-096', type: 'إنشاء', actor: 'عبدالله السالم', role: 'مدير النظام', email: 'admin@daam.sa', desc: 'إنشاء تاجر جديد: متجر انتعاش', entity: 'M-007', time: '2026-02-01 10:11', ip: '10.20.4.18' },
  ] as AuditLog[],

  seq: { merchant: 8, plt: 4, log: 100 },
}