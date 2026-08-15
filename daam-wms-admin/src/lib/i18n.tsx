import { usePrefsStore } from '@/store/prefs-store'
// @ts-nocheck -- duplicate display labels are intentionally resolved by last-write-wins behavior.
const EN: Record<string, string> = {
  'لوحة التحكم': 'Dashboard', 'الموافقات': 'Approvals', 'التجار': 'Merchants', 'منتجات المنصة': 'Platform Products', 'طلبات المخزون': 'Stock Requests', 'مستويات المخزون': 'Stock Levels', 'استخدام التخزين': 'Storage Usage', 'الطلبات': 'Orders', 'المرتجعات': 'Returns', 'طلبات السحب': 'Withdrawals', 'المحافظ': 'Wallets', 'الفواتير': 'Invoices', 'طلبات الخدمة': 'Service Requests', 'الاشتراكات': 'Subscriptions', 'أنواع الخدمات': 'Service Types', 'التقارير': 'Reports', 'الإعدادات': 'Settings', 'السجلات': 'System Logs', 'الإشعارات': 'Notifications', 'الملف الشخصي': 'My Profile', 'تسجيل الخروج': 'Logout',
  'المنتجات': 'Products', 'المخزون': 'Inventory', 'المحفظة والمالية': 'Wallet & Finance', 'مركز الإشعارات': 'Notification Center', 'التقارير والتحليلات': 'Reports & Analytics',
  'الموافقات الموحّدة': 'Unified Approvals', 'إدارة التجار': 'Merchant Management', 'إدارة الطلبات': 'Order Management', 'إدارة المرتجعات': 'Return Management', 'طلبات المخزون المعلقة': 'Pending Stock Requests', 'الفواتير الشهرية': 'Monthly Invoices', 'محافظ التجار': 'Merchant Wallets', 'طلبات السحب المعلقة': 'Pending Withdrawals', 'اشتراكات الخدمات': 'Service Subscriptions', 'إعدادات النظام': 'System Settings', 'سجلات النظام': 'System Logs',
  'حفظ التغييرات': 'Save Changes', 'تصدير': 'Export', 'إلغاء': 'Cancel', 'حذف': 'Delete', 'تعديل': 'Edit', 'عرض': 'View', 'اعتماد': 'Approve', 'رفض': 'Reject', 'بحث': 'Search',
  'عام': 'General', 'المخزون والتخزين': 'Inventory & Storage', 'المالية والفوترة': 'Finance & Billing', 'قوالب البريد': 'Email Templates', 'التكاملات': 'Integrations', 'المظهر واللغة': 'Appearance & Language', 'وضع العرض': 'Theme', 'لغة الواجهة': 'Interface Language',
  'نظرة عامة': 'Overview', 'سجل المعاملات': 'Transactions',
  'الطلبات المعلقة': 'Pending Orders', 'المرتجعات المعلقة': 'Pending Returns', 'طلبات الخدمة المعلقة': 'Pending Service Requests', 'الموافقات المعلقة': 'Pending Approvals', 'إجمالي أرصدة المحافظ': 'Total Wallet Balances',
  'اتجاه الطلبات — آخر ٣٠ يومًا': 'Orders Trend — Last 30 Days', 'أعلى التجار بالرصيد': 'Top Merchants by Balance',
  'لوحة تحكم الإدارة — 3PL': 'Admin Console — 3PL', 'بوابة التجار — 3PL': 'Merchant Portal — 3PL',
  'إجمالي المنتجات': 'Total Products', 'طلبات نشطة': 'Active Orders', 'طلبات مكتملة': 'Completed Orders', 'مرتجعات معلقة': 'Pending Returns', 'رصيد المحفظة': 'Wallet Balance', 'منتجات منخفضة المخزون': 'Low Stock Products', 'منتجات نفد مخزونها': 'Out of Stock Products', 'فاتورة الشهر الحالي': 'Current Month Invoice', 'منتجات المنصة المتاحة': 'Available Platform Products', 'بانتظار التوليد': 'Pending Generation',
  'تطبيق النطاق': 'Apply Range', 'تصدير PDF': 'Export PDF', 'تحديث تلقائي كل ٥ دقائق': 'Auto-refresh every 5 minutes', 'من تاريخ': 'From date', 'إلى تاريخ': 'To date',
  'توزيع حالات الطلبات': 'Order Status Distribution', 'المنتجات الأكثر مبيعًا': 'Top Selling Products', 'المخزون حسب موقع المستودع (متاح/محجوز)': 'Stock by Warehouse Location (Available/Reserved)', 'اتجاه الإيرادات الشهري — آخر ١٢ شهرًا': 'Monthly Revenue Trend — Last 12 Months',
}
export function useT() {
  const lang = usePrefsStore(s => s.lang)
  return (s: string) => (lang === 'en' ? EN[s] ?? s : s)
}
