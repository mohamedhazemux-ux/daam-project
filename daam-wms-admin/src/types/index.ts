export type JoinStatus = 'منضم' | 'غير منضم بعد'
export type EntityStatus = 'نشط' | 'موقوف' | 'مجمّد'
export type Urgency = 'عادي' | 'عاجل' | 'حرج'
export interface Admin { id: string; name: string; email: string; pwd: string; role: string; dept: string; phone: string; gender: 'ذكر' | 'أنثى' }
export interface Merchant { id: string; store: string; first: string; last: string; email: string; phone: string; status: EntityStatus; join: JoinStatus; created: string; gender: 'ذكر' | 'أنثى'; bank: string; iban: string; natId: string; natAddr: string; limit: number; used: number; unit: string; notes?: string; attachments?: string[] }
export interface PlatformProduct { ref: string; name: string; desc: string; status: 'نشط' | 'غير نشط'; created: string; linked: boolean; length?: number; width?: number; height?: number; volume?: number }
export interface StockRequest { id: string; m: string; date: string; type: 'إضافة' | 'سحب'; qty: number; p: string; wh: string; status: 'معلق' | 'معتمد' | 'مرفوض'; notes?: string; attachment?: string }
export interface StockLevel { p: string; sku: string; wh: string; avail: number; res: number }
export interface Order { id: string; m: string; date: string; status: 'معلق' | 'قيد المعالجة' | 'مكتمل' | 'ملغي' | 'جاري الشحن' | 'ارجاع'; items: number; total: number; ship: 'منصة' | 'ذاتي'; cust: string; attachments?: string[] }
export interface ReturnRequest { ref: string; m: string; email: string; order: string; cust: string; count: number; type: string; date: string; status: string; reason?: string; notes?: string; attachment?: string }
export interface Withdrawal { id: string; m: string; email: string; amount: number; method: string; bank: string; date: string; status: string; notes?: string; attachment?: string }
export interface Wallet { m: string; email: string; bal: number; res: number; credits: number; debits: number; last: string; status: EntityStatus }
export interface Invoice { ref: string; m: string; email: string; period: string; total: number; status: string; due: string; gen: string; sent: string }
export interface ServiceType { name: string; desc: string; cost: number; unit: string; prod: 'نعم' | 'لا'; status: 'نشط' | 'غير نشط'; model: 'دفعة واحدة' | 'متكرر'; freq: string }
export interface ServiceRequest { ref: string; m: string; email: string; type: string; prod: string; qty: number; cost: number; urgency: Urgency; date: string; req: string; status: string; notes?: string; attachment?: string }
export interface Subscription { id: string; m: string; type: string; cost: number; freq: string; next: string; status: string; total: number; start: string }
export interface Approval { id: string; type: string; urgency: string; who: string; title: string; date: string; days: number; qty?: number; sourceRef?: string }
export interface AppNotification { id: string; title: string; msg: string; type: string; icon: string; color: string; time: string; unread: boolean }
export interface NotifEvent { name: string; email: boolean; app: boolean; sms: boolean; tpl: string }
export interface AuditLog { id: string; type: string; actor: string; role: string; email: string; desc: string; entity: string; time: string; ip: string }
export interface ListQuery { q?: string; page?: number; pageSize?: number; [key: string]: unknown }
export interface ListResult<T> { rows: T[]; total: number }
export type Permission = 'merchants.read' | 'merchants.create' | 'merchants.update' | 'merchants.delete' | 'orders.read' | 'orders.update' | 'inventory.read' | 'inventory.approve' | 'finance.read' | 'finance.approve' | 'services.approve' | 'approvals.approve' | 'settings.manage'
export interface SessionUser { portal: 'admin' | 'merchant'; id: string; name: string; email: string; role: string; phone?: string; gender?: string; dept?: string; store?: string }
