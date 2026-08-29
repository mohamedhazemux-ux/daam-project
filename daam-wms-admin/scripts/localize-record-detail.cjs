const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/features/shared/record-detail-page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace value return
content = content.replace(
  "if (config.statusKeys?.includes(key)) return <StatusBadge value={String(raw)} />\n    return String(raw)",
  "if (config.statusKeys?.includes(key)) return <StatusBadge value={String(raw)} />\n    return typeof raw === 'string' ? t(raw) : String(raw)"
);

const replacements = [
  ["<h3 className=\"text-sm font-black\">مركز الإجراءات والعمليات</h3>", "<h3 className=\"text-sm font-black\">{t('مركز الإجراءات والعمليات')}</h3>"],
  ["<p className=\"text-xs text-muted-foreground\">الإجراءات المتاحة لهذا السجل وفقاً لحالته الحالية والصلاحيات الإدارية</p>", "<p className=\"text-xs text-muted-foreground\">{t('الإجراءات المتاحة لهذا السجل وفقاً لحالته الحالية والصلاحيات الإدارية')}</p>"],
  ["الحالة الحالية: <StatusBadge value={currentStatus} />", "{t('الحالة الحالية:')} <StatusBadge value={currentStatus} />"],
  ["<span className=\"text-xs font-bold text-muted-foreground\">نوع التسليم والشحن:</span>", "<span className=\"text-xs font-bold text-muted-foreground\">{t('نوع التسليم والشحن:')}</span>"],
  ["{data.ship === 'ذاتي' ? 'الشحن الذاتي (Self Delivery)' : 'شحن المنصة (Platform Delivery)'}", "{data.ship === 'ذاتي' ? t('الشحن الذاتي') : t('شحن المنصة')}"],
  ["<span className=\"text-xs font-bold text-muted-foreground\">حالة الطلب:</span>", "<span className=\"text-xs font-bold text-muted-foreground\">{t('حالة الطلب:')}</span>"],
  ["<p className=\"font-extrabold text-sm mb-1\">تم رفض هذا الطلب (Rejected)</p>", "<p className=\"font-extrabold text-sm mb-1\">{t('تم رفض هذا الطلب')}</p>"],
  ["سبب الرفض: {String(data.rejectionReason || 'معلومات غير مطابقة أو طلب غير صالح')}", "{t('سبب الرفض:')} {t(String(data.rejectionReason || 'معلومات غير مطابقة أو طلب غير صالح'))}"],
  ["<p className=\"font-extrabold text-sm mb-1 text-foreground\">تم إلغاء هذا الطلب (Cancelled)</p>", "<p className=\"font-extrabold text-sm mb-1 text-foreground\">{t('تم إلغاء هذا الطلب')}</p>"],
  ["سبب الإلغاء: {String(data.cancellationReason || 'تم الإلغاء بناء على طلب العميل أو الإدارة')}", "{t('سبب الإلغاء:')} {t(String(data.cancellationReason || 'تم الإلغاء بناء على طلب العميل أو الإدارة'))}"],
  ["<p className=\"font-extrabold text-sm mb-1\">تم اكتمال وتنفيذ الطلب بنجاح (Successfully Fulfilled)</p>", "<p className=\"font-extrabold text-sm mb-1\">{t('تم اكتمال وتنفيذ الطلب بنجاح')}</p>"],
  ["<p>تم تسليم المنتجات واكتمال دورة حياة الطلب بالكامل.</p>", "<p>{t('تم تسليم المنتجات واكتمال دورة حياة الطلب بالكامل.')}</p>"],
  ["<p className=\"text-xs font-extrabold text-muted-foreground\">الإجراءات المتاحة للمرحلة الحالية:</p>", "<p className=\"text-xs font-extrabold text-muted-foreground\">{t('الإجراءات المتاحة للمرحلة الحالية:')}</p>"],
  ["<CheckCircle className=\"size-4\" /> قبول الطلب وبدء التنفيذ (Accept)", "<CheckCircle className=\"size-4\" /> {t('قبول الطلب وبدء التنفيذ')}"],
  ["<XCircle className=\"size-4\" /> رفض الطلب نهائياً (Reject)", "<XCircle className=\"size-4\" /> {t('رفض الطلب نهائياً')}"],
  ["<PackageCheck className=\"size-4\" /> بدء التغليف والتجهيز (Pack)", "<PackageCheck className=\"size-4\" /> {t('بدء التغليف والتجهيز')}"],
  ["<Store className=\"size-4\" /> جاهز للاستلام والتسليم (Pick-up)", "<Store className=\"size-4\" /> {t('جاهز للاستلام والتسليم')}"],
  ["<CheckCheck className=\"size-4\" /> تأكيد اكتمال التسليم للعميل (Complete)", "<CheckCheck className=\"size-4\" /> {t('تأكيد اكتمال التسليم للعميل')}"],
  ["<Truck className=\"size-4\" /> بدء الشحن وتعيين مندوب (Start Delivery)", "<Truck className=\"size-4\" /> {t('بدء الشحن وتعيين مندوب')}"],
  ["<CheckCheck className=\"size-4\" /> تأكيد وصول الشحنة واكتمال الطلب (Complete)", "<CheckCheck className=\"size-4\" /> {t('تأكيد وصول الشحنة واكتمال الطلب')}"],
  ["<XCircle className=\"size-4\" /> إلغاء الطلب (Cancel)", "<XCircle className=\"size-4\" /> {t('إلغاء الطلب')}"],
  ["setReasonErr('سبب الإلغاء إلزامي ويجب أن يكون بين 5 و 500 حرف (اكتب السبب أدناه)')", "setReasonErr(t('سبب الإلغاء إلزامي ويجب أن يكون بين 5 و 500 حرف (اكتب السبب أدناه)'))"],
  ["{currentStatus === 'معلق' ? 'سبب الرفض (إلزامي في حال الضغط على رفض الطلب — 5 إلى 500 حرف):' : 'سبب الإلغاء (إلزامي في حال الضغط على إلغاء الطلب — 5 إلى 500 حرف):'}", "{currentStatus === 'معلق' ? t('سبب الرفض (إلزامي في حال الضغط على رفض الطلب — 5 إلى 500 حرف):') : t('سبب الإلغاء (إلزامي في حال الضغط على إلغاء الطلب — 5 إلى 500 حرف):')}"],
  ["placeholder={currentStatus === 'معلق' ? 'اكتب سبب رفض الطلب هنا...' : 'اكتب سبب إلغاء الطلب هنا...'}", "placeholder={currentStatus === 'معلق' ? t('اكتب سبب رفض الطلب هنا...') : t('اكتب سبب إلغاء الطلب هنا...')}"],
  ["{data.status === 'نشط' ? 'إيقاف حساب التاجر' : 'تفعيل حساب التاجر'}", "{data.status === 'نشط' ? t('إيقاف حساب التاجر') : t('تفعيل حساب التاجر')}"],
  ["<ShieldCheck className=\"size-4\" /> اعتماد انضمام التاجر (منضم)", "<ShieldCheck className=\"size-4\" /> {t('اعتماد انضمام التاجر (منضم)')}"],
  ["<Layers className=\"size-4\" /> تعديل حد التخزين ({Number(data.limit ?? 100)} م³)", "<Layers className=\"size-4\" /> {t('تعديل حد التخزين')} ({Number(data.limit ?? 100)} {t('م³')})"],
  ["<ShoppingCart className=\"size-4\" /> عرض طلبات التاجر", "<ShoppingCart className=\"size-4\" /> {t('عرض طلبات التاجر')}"],
  ["<Package className=\"size-4\" /> عرض منتجات التاجر", "<Package className=\"size-4\" /> {t('عرض منتجات التاجر')}"],
  ["<CheckCircle className=\"size-4\" /> اعتماد طلب الإرجاع واستلام القطع", "<CheckCircle className=\"size-4\" /> {t('اعتماد طلب الإرجاع واستلام القطع')}"],
  ["<CheckCheck className=\"size-4\" /> إتمام معالجة طلب الإرجاع", "<CheckCheck className=\"size-4\" /> {t('إتمام معالجة طلب الإرجاع')}"],
  ["<CheckCircle className=\"size-4\" /> اعتماد طلب سحب الرصيد والتحويل", "<CheckCircle className=\"size-4\" /> {t('اعتماد طلب سحب الرصيد والتحويل')}"],
  ["<CheckCircle className=\"size-4\" /> اعتماد طلب المخزون وإدخاله", "<CheckCircle className=\"size-4\" /> {t('اعتماد طلب المخزون وإدخاله')}"],
  ["toast.success('تم تعيين المستودع والموقع بنجاح')", "toast.success(t('تم تعيين المستودع والموقع بنجاح'))"],
  ["<Layers className=\"size-4\" /> تعيين موقع الرف والتخزين", "<Layers className=\"size-4\" /> {t('تعيين موقع الرف والتخزين')}"],
  ["<CheckCircle className=\"size-4\" /> اعتماد طلب الخدمة وتحديد التكلفة", "<CheckCircle className=\"size-4\" /> {t('اعتماد طلب الخدمة وتحديد التكلفة')}"],
  ["<Clock className=\"size-4\" /> تقدم حالة الخدمة ({currentStatus === 'معتمد' ? 'بدء التنفيذ' : 'تأكيد الإنجاز'})", "<Clock className=\"size-4\" /> {t('تقدم حالة الخدمة')} ({currentStatus === 'معتمد' ? t('بدء التنفيذ') : t('تأكيد الإنجاز')})"],
  ["<CheckCircle className=\"size-4\" /> اعتماد الموافقة فورياً", "<CheckCircle className=\"size-4\" /> {t('اعتماد الموافقة فورياً')}"],
  ["<HelpCircle className=\"size-4\" /> طلب معلومات إضافية", "<HelpCircle className=\"size-4\" /> {t('طلب معلومات إضافية')}"],
  ["<Send className=\"size-4\" /> إسناد لمشرف آخر", "<Send className=\"size-4\" /> {t('إسناد لمشرف آخر')}"],
  ["<Label className=\"mb-2 block text-xs font-bold text-muted-foreground\">رفض الطلب مع توثيق السبب الإداري:</Label>", "<Label className=\"mb-2 block text-xs font-bold text-muted-foreground\">{t('رفض الطلب مع توثيق السبب الإداري:')}</Label>"],
  ["<XCircle className=\"size-4\" /> رفض الطلب رسمياً", "<XCircle className=\"size-4\" /> {t('رفض الطلب رسمياً')}"],
  ["title={'معاينة المرفق — ' + (previewAttachment ?? '')}", "title={t('معاينة المرفق') + ' — ' + (previewAttachment ?? '')}"],
  ["footer={<Button variant=\"outline\" onClick={() => setPreviewAttachment(null)}>إغلاق</Button>}", "footer={<Button variant=\"outline\" onClick={() => setPreviewAttachment(null)}>{t('إغلاق')}</Button>}"],
  ["<p className=\"text-sm font-bold\">معاينة {attachmentExtension(previewAttachment).toUpperCase()}</p>", "<p className=\"text-sm font-bold\">{t('معاينة')} {attachmentExtension(previewAttachment).toUpperCase()}</p>"],
  ["<p className=\"text-xs text-muted-foreground\">الملف متاح للعرض بعد ربطه برابط التخزين من الخادم.</p>", "<p className=\"text-xs text-muted-foreground\">{t('الملف متاح للعرض بعد ربطه برابط التخزين من الخادم.')}</p>"],
  ["title=\"اختيار شركة الشحن لطباعة البوليصة\"", "title={t('اختيار شركة الشحن لطباعة البوليصة')}"],
  ["<Button variant=\"outline\" onClick={() => setCarrierModalOpen(false)}>إلغاء</Button>", "<Button variant=\"outline\" onClick={() => setCarrierModalOpen(false)}>{t('إلغاء')}</Button>"],
  ["<p className=\"text-sm font-bold\">{log.desc}</p>", "<p className=\"text-sm font-bold\">{t(log.desc)}</p>"],
  ["<p className=\"mt-1 text-xs text-muted-foreground\">{log.actor} · {log.time}</p>", "<p className=\"mt-1 text-xs text-muted-foreground\">{t(log.actor)} · {log.time}</p>"],
];

replacements.forEach(([from, to]) => {
  if (content.includes(from)) {
    content = content.split(from).join(to);
  }
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated shared record-detail-page.tsx!');
