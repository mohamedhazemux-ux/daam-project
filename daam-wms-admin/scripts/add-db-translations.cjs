// scripts/add-db-translations.cjs
const fs = require('fs');

const en = JSON.parse(fs.readFileSync('./src/locales/en.json', 'utf8'));
const ar = JSON.parse(fs.readFileSync('./src/locales/ar.json', 'utf8'));

const translations = {
  // Platform products
  'عبوة شحن قياسية': 'Standard Shipping Box',
  'عبوة كرتونية مقواة بأحجام موحدة معتمدة من المنصة': 'Reinforced cardboard packaging in uniform sizes certified by the platform',
  'ملصقات تعريفية': 'Identification Labels',
  'رولات ملصقات حرارية بشعار المنصة': 'Thermal label rolls with platform logo',
  'صندوق هدايا المنصة': 'Platform Gift Box',
  'صندوق تغليف فاخر مع شريط وشعار الدعم الرائدة': 'Luxury packaging box with ribbon and Leading Support logo',
  'بطاقة إهداء رقمية': 'Digital Gift Card',
  'بطاقة إهداء رقمية غير مخزنة تُضاف للطلبات مباشرة': 'Unstored digital gift card added directly to orders',

  // Stock products
  'منظف أرضيات معطر 3لتر': 'Scented Floor Cleaner 3L',
  'سائل غسيل الصحون 1لتر': 'Dishwashing Liquid 1L',
  'شامبو طبيعي بالأعشاب': 'Natural Herbal Shampoo',
  'صابون سائل لليدين': 'Liquid Hand Soap',
  'معقم أسطح متعدد الاستخدام': 'Multi-Purpose Surface Disinfectant',
  'قهوة تركية فاخرة 250جم': 'Premium Turkish Coffee 250g',
  'منعم أقمشة مركّز': 'Concentrated Fabric Softener',
  'لوشن عناية بالجسم': 'Body Care Lotion',

  // Notes and messages in stock requests
  'يرجى الفحص والتأكد من سلامة الأكياس المعبأة كليا من البن والتحقق من الوزن الإجمالي.': 'Please inspect and ensure integrity of completely packaged coffee bags and verify gross weight.',
  'شحنة منظفات إضافية لتغطية الطلب المتزايد في المنطقة الغربية.': 'Additional detergent shipment to cover surging demand in Western region.',
  'سحب جزئي مؤقت للتوصيل المباشر لمعرض الرياض الدولي للقهوة.': 'Temporary partial withdrawal for direct delivery to Riyadh International Coffee Exhibition.',
  'تم الرفض لعدم اكتمال شهادة مطابقة الجودة للمنتج المورد.': 'Rejected due to incomplete quality conformity certificate for supplied product.',
  'الكمية المطلوبة تتجاوز الرصيد المتاح حالياً للحجز.': 'Requested quantity exceeds currently available balance for reservation.',

  // Customers
  'أحمد الغامدي': 'Ahmed Al-Ghamdi',
  'لطيفة الحسن': 'Latifa Al-Hassan',
  'سلطان الرشيد': 'Sultan Al-Rasheed',
  'منيرة العبدالله': 'Mounira Al-Abdullah',
  'جواهر السبيعي': 'Jawaher Al-Subaie',
  'ناصر الشهراني': 'Nasser Al-Shahrani',
  'عائشة المالكي': 'Aisha Al-Malki',
  'تركي الحمد': 'Turki Al-Hamad',
  'دانة الخالدي': 'Dana Al-Khalidi',
  'بدر القرني': 'Badr Al-Qarni',

  // Order notes and statuses
  'يرجى التأكد من مطابقة الكمية قبل تجهيز الطلب وإرفاق صورة التغليف.': 'Please ensure quantity matches before packing order and attach packaging photo.',
  'قيد المعالجة': 'Processing',
  'تم تسليم الشحنة للناقل الذاتي والتأكد من سلامة العبوات.': 'Shipment delivered to self-carrier and packaging integrity confirmed.',
  'تمت مراجعة بيانات الشحن، ويرجى تسليم الطلب خلال فترة العمل.': 'Shipping details reviewed, please deliver order during business hours.',

  // Return notes and reasons
  'يرجى التحقق من سلامة المنتج قبل إعادة إدخاله للمخزون.': 'Please verify product condition before restocking.',
  'المنتجات مصنَّعة حسب الطلب، نحتاج مراجعة قبل إعادة التوريد.': 'Custom-made products, review required before re-supplying.',
  'المنتج تالف أثناء التشغيل، يُطلب إتلافه وفق الإرشادات.': 'Product damaged during operation, disposal requested per guidelines.',
  'تم فحص المنتجات ووضعها في دورة الاستلام.': 'Products inspected and placed in receiving cycle.',
  'المتجر قام بتغليف المنتج بطريقة مناسبة للتوصيل.': 'Store packaged the product properly for delivery.',
  'استلام المنتج من العميل تم في نفس اليوم.': 'Product received from customer on the same day.',
  'تقرير الفحص جاهز، المنتج مناسب للإعادة إلى المخزون.': 'Inspection report ready, product suitable for restocking.',
  'تم إرجاع المبالغ إلى رصيد المحفظة.': 'Funds returned to wallet balance.',
  'تم رفض طلب الإرجاع لتجاوز المدة النظامية المسموح بها.': 'Return request rejected due to exceeding statutory return window.',

  // Withdrawal notes
  'مبلغ السحب مرتبط بشحنة قهوة جديدة ومستلزمات التعبئة.': 'Withdrawal amount linked to new coffee shipment and packaging supplies.',
  'السحب مخصص لتجديد المخزون في جدة.': 'Withdrawal allocated for inventory replenishment in Jeddah.',
  'طلب سحب لتمويل شحنة القهوة القادمة.': 'Withdrawal request to fund upcoming coffee shipment.',
  'تم اعتماد السحب إلى رصيد المحفظة.': 'Withdrawal approved to wallet balance.',
  'التحويل قيد التنفيذ خلال اليوم التالي.': 'Transfer in progress within the next day.',
  'تم تنفيذ الحوالة بنجاح إلى الحساب البنكي.': 'Wire transfer executed successfully to bank account.',
  'رصيد المحفظة غير كافٍ لتغطية المبلغ المطلوب.': 'Wallet balance insufficient to cover requested amount.',
  'تم إلغاء الطلب بواسطة التاجر.': 'Order cancelled by merchant.',

  // Invoice statuses & terms
  'مرسلة': 'Sent',
  'مدفوعة': 'Paid',
  'متأخرة': 'Overdue',
  'مستعرضة': 'Viewed',
  'تم الإنشاء': 'Created',

  // Services catalog
  'تغليف المنتجات': 'Product Packaging',
  'خدمة تغليف وتعبئة المنتجات حسب معايير المنصة': 'Packaging and bagging service per platform standards',
  'لكل قطعة': 'Per Piece',
  'التخزين المبرد': 'Cold Storage',
  'تخزين المنتجات الحساسة في غرف مبردة': 'Storage of sensitive products in refrigerated rooms',
  'لكل طلب': 'Per Order',
  'شهري': 'Monthly',
  'وضع الملصقات': 'Labelling',
  'طباعة ووضع الملصقات التعريفية': 'Printing and applying identification labels',
  'تصوير المنتجات': 'Product Photography',
  'تصوير احترافي للمنتجات': 'Professional product photography',
  'لكل منتج': 'Per Product',
  'إدارة الإرجاع الشاملة': 'Comprehensive Returns Management',
  'استقبال وفحص ومعالجة مرتجعات المتجر': 'Receiving, inspecting, and processing store returns',
  'ربع سنوي': 'Quarterly',
  'فحص الجودة المخبري': 'Laboratory Quality Inspection',
  'إجراء تحاليل مخبرية معتمدة لشهادات الجودة للمنتجات الغذائية والطبية': 'Certified laboratory testing for quality certificates of food and medical products',
  'لكل عينة': 'Per Sample',
  'سنوي': 'Annually',
  'قهوة عربية': 'Arabic Coffee',
  'يرجى تغليف القطع في أرقام مخصصة حسب الطلبات المميزة.': 'Please pack items in custom numbering per special orders.',
  'الطلب يحتاج خدمة فورية بسبب زيادة الطلب في المنطقة الغربية.': 'Request requires urgent service due to surging demand in Western region.',
  'قهوة تركية': 'Turkish Coffee',
  'مجموعة ملصقات احتياج لعرض فعلي في معرض الرياض.': 'Set of labels needed for live display at Riyadh exhibition.',
  'لوشن عناية': 'Care Lotion',
  'تم إنهاء جلسة التصوير وتسليم الأصول الرقمية.': 'Photography session concluded and digital assets delivered.',
  'منظف أرضيات': 'Floor Cleaner',
  'تم الرفض لعدم توفر قوالب التغليف المخصصة لهذا المنتج حالياً.': 'Rejected due to current unavailability of custom packaging molds for this product.',
  'فشل الدفع': 'Payment Failed',
  'أسبوعي': 'Weekly',

  // Approvals & Notifications
  'طلب تأهيل تاجر جديد — متجر انتعاش': 'New Merchant Qualification Request — Int3ash Store',
  'إضافة 200 قطعة — قهوة عربية مختصة': 'Add 200 Units — Specialty Arabic Coffee',
  'سحب 120 قطعة — قهوة تركية فاخرة': 'Withdraw 120 Units — Premium Turkish Coffee',
  'طلب إرجاع': 'Return Request',
  'إرجاع RET-2003 — إتلاف منتج تالف': 'Return RET-2003 — Dispose of Damaged Product',
  'طلب سحب مالي': 'Financial Withdrawal Request',
  'سحب 7,800.00 ر.س — تحويل بنكي': 'Withdraw 7,800.00 SAR — Bank Transfer',
  'طلب خدمة': 'Service Request',
  'طلب خدمة تخزين مبرد — متجر النقاء': 'Cold Storage Service Request — Naqaa Store',
  'قالب إشعار حالة الطلب': 'Order Status Notification Template',
  'قالب اعتماد المخزون': 'Stock Approval Template',
  'قالب رفض الطلبات': 'Request Rejection Template',
  'موافقة معلقة جديدة': 'New Pending Approval',
  'طلب سحب مالي حرج APR-9005 من مؤسسة ركن القهوة بانتظار المراجعة منذ 4 أيام': 'Critical withdrawal request APR-9005 from Rukn Coffee Est. awaiting review for 4 days',
  'قبل 5 دقائق': '5 minutes ago',
  'تنبيه تجاوز حد التخزين': 'Storage Limit Exceeded Alert',
  'تجاوز متجر مؤسسة ركن القهوة حد التخزين المجاني (100%)': 'Rukn Coffee Est. exceeded free storage limit (100%)',
  'قبل 20 دقيقة': '20 minutes ago',
  'طلب مرتجع جديد': 'New Return Request',
  'قبل ساعة': '1 hour ago',
  'فشل دفع اشتراك': 'Subscription Payment Failed',
  'تعذر خصم رسوم اشتراك التخزين المبرد لمتجر النقاء للتنظيف': 'Failed to deduct cold storage subscription fees for Naqaa Cleaning Store',
  'قبل ساعتين': '2 hours ago',
  'اكتمال طلب خدمة': 'Service Request Completed',
  'اكتمل طلب الخدمة SRV-4004 لمتجر الجمال الحديث': 'Service request SRV-4004 completed for Modern Beauty Store',
  'أمس': 'Yesterday',
  'تسجيل دخول ناجح إلى لوحة التحكم': 'Successful login to dashboard',
  'المصادقة': 'Authentication',
  'اعتماد طلب المخزون SR-0998 (+150 قطعة)': 'Approved stock request SR-0998 (+150 units)',
  'إنشاء تاجر جديد: متجر انتعاش': 'Created new merchant: Int3ash Store',
  'تسجيل خروج من النظام': 'Logged out of system',
  'تحديث بيانات المتجر وحد التخزين لمتجر البن الذهبي': 'Updated store data and storage limit for Golden Bean Store',
  'حذف منتج غير نشط من كتالوج المنصة': 'Deleted inactive product from platform catalog',
  'رفض طلب السحب WD-3007 لعدم كفاية الرصيد': 'Rejected withdrawal request WD-3007 due to insufficient balance',
  'تصدير تقرير مبيعات وطلبات شهر يناير بصيغة CSV': 'Exported January sales and orders report in CSV format',
  'نظام المراقبة الذكي': 'Smart Monitoring System',
  'الأمان': 'Security',
  'رصد محاولات تسجيل دخول متكررة غير مصرح بها من IP خارجي': 'Detected repeated unauthorized login attempts from external IP',
  'جدار الحماية': 'Firewall',
  'إعادة إرسال الفاتورة الشهرية INV-M-202601-001 للتاجر': 'Resent monthly invoice INV-M-202601-001 to merchant',
};

let count = 0;
for (const [k, v] of Object.entries(translations)) {
  if (!en[k]) {
    en[k] = v;
    count++;
  }
  if (!ar[k]) {
    ar[k] = k;
  }
}

fs.writeFileSync('./src/locales/en.json', JSON.stringify(en, null, 2), 'utf8');
fs.writeFileSync('./src/locales/ar.json', JSON.stringify(ar, null, 2), 'utf8');

console.log(`Added ${count} translations from db.ts mock records! Total keys: ${Object.keys(en).length}`);
