const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, '../src/locales/en.json');
const arPath = path.join(__dirname, '../src/locales/ar.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));

const specific102 = {
  "الحالة الفعلية": "Actual Condition",
  "الحجم المقدر للمنتج": "Estimated Product Volume",
  "الخط الزمني للحالات": "Status Timeline",
  "الرسالة": "Message",
  "الرسوم القادمة": "Upcoming Fees",
  "الرصيد الحالي للمحفظة": "Current Wallet Balance",
  "الرصيد الختامي": "Closing Balance",
  "الرصيد بعد المعاملة": "Balance after Transaction",
  "السعر الفردي": "Individual Price",
  "السماح بإعادة التقديم": "Allow Resubmission",
  "الصفحة التالية": "Next Page",
  "الصفحة السابقة": "Previous Page",
  "الصور": "Images",
  "الصيغة": "Format",
  "الطلبات الحرجة محاطة بإطار أحمر": "Critical orders highlighted with red border",
  "الطول": "Length",
  "العنوان المسجل": "Registered Address",
  "الفوترة القادمة": "Next Billing",
  "القطع المتوقعة": "Expected Items",
  "الكمية الفعلية": "Actual Quantity",
  "الكمية الكلية": "Total Quantity",
  "الكمية المعتمدة": "Approved Quantity",
  "المبلغ المحجوز": "Reserved Amount",
  "المبلغ المستحق": "Amount Due",
  "المتاح": "Available",
  "المجموع الفرعي": "Subtotal",
  "المحجوز": "Reserved",
  "المرفقات والوثائق": "Attachments & Documents",
  "المساحة المتبقية": "Remaining Space",
  "المستودع المصدر": "Source Warehouse",
  "المستودع الوجهة": "Destination Warehouse",
  "المعتمد الجديد": "New Approver",
  "الملاحظات والبيانات الإضافية": "Notes & Additional Data",
  "المنتجات الأكثر مبيعًا": "Top Selling Products",
  "الموعد النهائي للاستجابة": "Response Deadline",
  "بانتظار التوليد": "Awaiting Generation",
  "بحد أقصى": "Maximum of",
  "بدء التنفيذ": "Start Execution",
  "بريدات فاشلة": "Failed Emails",
  "بريدات مرسلة": "Sent Emails",
  "بعد الإنشاء بيوم واحد": "1 day after creation",
  "بند الفاتورة": "Invoice Line Item",
  "بنود ورسوم الفاتورة": "Invoice Line Items & Fees",
  "تجاوز حد التخزين": "Storage Limit Exceeded",
  "ترقيم الصفحات": "Pagination",
  "تصنيف الرفض": "Rejection Classification",
  "تطبيق النطاق": "Apply Range",
  "تفعيل حجز المخزون": "Enable Stock Reservation",
  "تكرار الدورة": "Cycle Recurrence",
  "توليد الفواتير الشهرية الآن": "Generate Monthly Invoices Now",
  "توليد المنتجات": "Generate Products",
  "حد التخزين المجاني الافتراضي": "Default Free Storage Limit",
  "حد التنبيه للمخزون المنخفض": "Low Stock Alert Threshold",
  "حرف": "chars",
  "حرفًا": "chars",
  "دورية الفوترة": "Billing Frequency",
  "رجوع": "Back",
  "رسوم الدورة الأولى": "First Cycle Fees",
  "رسوم تنفيذ الطلبات": "Order Fulfillment Fees",
  "رسوم فاشلة": "Failed Fees",
  "رسوم ناجحة": "Successful Fees",
  "زيادة": "Increase",
  "سم": "cm",
  "شركة الشحن المعتمدة": "Authorized Shipping Carrier",
  "صاحب الحساب": "Account Holder",
  "صافي الإيرادات": "Net Revenue",
  "صافي التغيير": "Net Change",
  "صافي المبلغ المسترد": "Net Refunded Amount",
  "صورة ومرفقات المنتج": "Product Image & Attachments",
  "طريقة الاسترداد المفضلة": "Preferred Refund Method",
  "عارض المرفقات": "Attachment Viewer",
  "عدد التجار المتجاوزين لحد التخزين": "Number of merchants exceeding storage limit",
  "عدد الفواتير المولدة": "Number of generated invoices",
  "قيمة الكمية": "Quantity Value",
  "كتالوج المنصة": "Platform Catalog",
  "للقراءة فقط": "Read Only",
  "متوسط زمن الموافقة": "Average Approval Time",
  "متوسط قيمة الطلب": "Average Order Value",
  "مجدولة": "Scheduled",
  "محفظة": "Wallet",
  "مرة واحدة": "One Time",
  "مرجع الإرجاع": "Return Reference",
  "مرجع الطلب": "Order Reference",
  "مرجع العملية": "Operation Reference",
  "مرجع الفاتورة": "Invoice Reference",
  "مسؤولية الشحن الافتراضية للطلبات الجديدة": "Default shipping responsibility for new orders",
  "مستوى الإلحاح": "Urgency Level",
  "مصدر المنتج": "Product Source",
  "معالجة الاسترداد": "Process Refund",
  "معدل تنفيذ الطلبات": "Order Fulfillment Rate",
  "معدل طبيعي": "Normal Rate",
  "معرف الاشتراك": "Subscription ID",
  "معرّف المعاملة": "Transaction ID",
  "ملخص استخدام التخزين": "Storage Usage Summary",
  "منتجاتي": "My Products",
  "نسبة الإرجاع": "Return Rate",
  "نسبة الاستخدام": "Usage Percentage",
  "نسبة التنبيه التحذيري": "Warning Alert Percentage",
  "وصف البند": "Item Description",
  "يتطلب منتجًا": "Requires a product",
  "يمكنك كتابة الرقم مباشرة": "You can type the number directly",
  "يوم الشهر": "Day of Month"
};

const finalEn = { ...en };
const finalAr = { ...ar };

Object.entries(specific102).forEach(([k, v]) => {
  finalEn[k] = v;
  finalAr[k] = k;
});

const arRegex = /[\u0600-\u06FF]/;
const remaining = Object.entries(finalEn).filter(([k,v]) => arRegex.test(v));

console.log('Zero check - Remaining Arabic in en.json:', remaining.length);
if (remaining.length > 0) {
  console.log('Still remaining:', remaining);
}

fs.writeFileSync(enPath, JSON.stringify(finalEn, null, 2), 'utf8');
fs.writeFileSync(arPath, JSON.stringify(finalAr, null, 2), 'utf8');
