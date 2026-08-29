import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { useUIStore } from '@/store/ui-store'
import { usePrefsStore } from '@/store/prefs-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { NotificationsPopover } from './notifications-popover'
import { Breadcrumbs } from './breadcrumbs'
import { audit } from '@/services/audit.service'
import { cn, initials } from '@/lib/utils'
import { BrandLogo } from '@/components/brand-logo'
import { LanguageToggle } from '@/components/language-toggle'
import { useT } from '@/lib/i18n'
import { LayoutDashboard, ShieldCheck, Store, Tags, Layers, Warehouse, BarChart3, ShoppingCart, Undo2, Banknote, Wallet, FileText, Wrench, RefreshCw, Settings, ScrollText, Bell, Menu, LogOut, User, type LucideIcon } from 'lucide-react'
const TITLES: Record<string, string> = {
  '/': 'لوحة التحكم', '/approvals': 'الموافقات الموحدة', '/merchants': 'إدارة التجار', '/platform-products': 'منتجات المنصة',
  '/inventory/requests': 'طلبات المخزون المعلقة', '/inventory/levels': 'مستويات المخزون', '/inventory/storage': 'استخدام التخزين',
  '/orders': 'إدارة الطلبات', '/returns': 'إدارة المرتجعات',
  '/finance/withdrawals': 'طلبات السحب المعلقة', '/finance/wallets': 'محافظ التجار', '/finance/invoices': 'الفواتير الشهرية',
  '/services/requests': 'طلبات الخدمة', '/services/subscriptions': 'اشتراكات الخدمات', '/services/types': 'أنواع الخدمات',
  '/reports': 'التقارير والتحليلات', '/settings': 'إعدادات النظام', '/logs': 'سجلات النظام', '/notifications': 'مركز الإشعارات', '/profile': 'الملف الشخصي',
}
const NAV: { section: string; items: { to: string; label: string; icon: LucideIcon }[] }[] = [
  { section: 'الرئيسية', items: [{ to: '/', label: 'لوحة التحكم', icon: LayoutDashboard }, { to: '/approvals', label: 'الموافقات', icon: ShieldCheck }] },
  { section: 'الإدارة', items: [{ to: '/merchants', label: 'التجار', icon: Store }, { to: '/platform-products', label: 'منتجات المنصة', icon: Tags }] },
  { section: 'المخزون', items: [{ to: '/inventory/requests', label: 'طلبات المخزون', icon: Layers }, { to: '/inventory/levels', label: 'مستويات المخزون', icon: Warehouse }, { to: '/inventory/storage', label: 'استخدام التخزين', icon: BarChart3 }] },
  { section: 'العمليات', items: [{ to: '/orders', label: 'الطلبات', icon: ShoppingCart }, { to: '/returns', label: 'المرتجعات', icon: Undo2 }] },
  { section: 'المالية', items: [{ to: '/finance/withdrawals', label: 'طلبات السحب', icon: Banknote }, { to: '/finance/wallets', label: 'المحافظ', icon: Wallet }, { to: '/finance/invoices', label: 'الفواتير', icon: FileText }] },
  { section: 'الخدمات', items: [{ to: '/services/requests', label: 'طلبات الخدمة', icon: Wrench }, { to: '/services/subscriptions', label: 'الاشتراكات', icon: RefreshCw }, { to: '/services/types', label: 'أنواع الخدمات', icon: Settings }] },
  { section: 'النظام', items: [{ to: '/reports', label: 'التقارير', icon: BarChart3 }, { to: '/settings', label: 'الإعدادات', icon: Settings }, { to: '/logs', label: 'السجلات', icon: ScrollText }, { to: '/notifications', label: 'الإشعارات', icon: Bell }] },
]
const RECORD_KIND_TO_NAV: Record<string, string> = {
  order: '/orders',
  merchant: '/merchants',
  withdrawal: '/finance/withdrawals',
  invoice: '/finance/invoices',
  return: '/returns',
  'stock-request': '/inventory/requests',
  'service-request': '/services/requests',
  approval: '/approvals',
}

const RECORD_KIND_TITLES: Record<string, string> = {
  order: 'تفاصيل الطلب',
  merchant: 'تفاصيل التاجر',
  withdrawal: 'تفاصيل طلب السحب',
  invoice: 'تفاصيل الفاتورة',
  return: 'تفاصيل طلب الإرجاع',
  'stock-request': 'تفاصيل طلب المخزون',
  'service-request': 'تفاصيل طلب الخدمة',
  approval: 'تفاصيل طلب الموافقة',
}

export function isNavActive(pathname: string, targetTo: string): boolean {
  if (targetTo === '/') return pathname === '/'
  if (pathname === targetTo || pathname.startsWith(targetTo + '/')) return true
  if (pathname.startsWith('/records/')) {
    const kind = pathname.split('/')[2]
    return RECORD_KIND_TO_NAV[kind] === targetTo
  }
  return false
}

function SidebarContent() {
  const t = useT()
  const location = useLocation()
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center border-b px-5"><BrandLogo /></div>
      <nav className="flex-1 space-y-4 overflow-y-auto p-3" aria-label="تنقل لوحة الإدارة">
        {NAV.map(g => (
          <div key={g.section}>
            <p className="mb-1 px-3 text-[10.5px] font-black text-muted-foreground">{t(g.section)}</p>
            {g.items.map(it => {
              const active = isNavActive(location.pathname, it.to)
              return (
                <NavLink
                  key={it.to}
                  to={it.to}
                  className={cn(
                    'mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-bold transition-colors',
                    active
                      ? 'bg-foreground text-background hover:bg-foreground hover:text-background'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  )}
                >
                  <it.icon className="size-[18px] shrink-0" aria-hidden />
                  <span className="flex-1">{t(it.label)}</span>
                </NavLink>
              )
            })}
          </div>
        ))}
      </nav>
      <div className="border-t px-4 py-3 text-[11px] font-bold text-muted-foreground">{t('إدارة المنصة')} — {t('الإصدار')} 2.0</div>
    </div>
  )
}
export function AppShell() {
  const { sidebarOpen, toggleSidebar, closeSidebar } = useUIStore()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const t = useT()
  const lang = usePrefsStore(s => s.lang)
  const getPageTitle = (pathname: string): string => {
    if (TITLES[pathname]) return TITLES[pathname]
    if (pathname.startsWith('/records/')) {
      const kind = pathname.split('/')[2]
      return RECORD_KIND_TITLES[kind] ?? 'تفاصيل السجل'
    }
    return 'لوحة التحكم'
  }
  const title = getPageTitle(location.pathname)
  const sheetSide = lang === 'ar' ? 'right' : 'left'
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[262px] shrink-0 border-e bg-card lg:block"><SidebarContent /></aside>
      <Sheet open={sidebarOpen} onOpenChange={v => { if (!v) closeSidebar() }}>
        <SheetContent side={sheetSide} className="w-[280px] p-0"><SidebarContent /></SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-20 items-center gap-3 border-b bg-card px-4 lg:px-6">
          <Button variant="outline" size="icon" className="lg:hidden" onClick={toggleSidebar} aria-label={t('فتح القائمة')}><Menu className="size-4" /></Button>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-extrabold">{t(title)}</h1>
            <div className="hidden sm:block">
              <Breadcrumbs portal="admin" />
            </div>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <LanguageToggle />
            <NotificationsPopover />
            <div className="relative">
              <button onClick={() => setMenuOpen(o => !o)} className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent" aria-label={t('قائمة الحساب')}>
                <Avatar className="size-8"><AvatarFallback className="bg-foreground text-background">{initials(user?.name ?? '')}</AvatarFallback></Avatar>
                <span className="hidden text-[13px] font-extrabold md:block">{t(user?.name ?? '')}</span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute end-0 z-50 mt-2 w-56 rounded-xl border bg-card p-2 shadow-lg">
                    <p className="border-b px-2 pb-2 pt-1 text-xs font-bold text-muted-foreground">{user?.email}</p>
                    <button onClick={() => { setMenuOpen(false); navigate('/profile') }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-[13px] font-bold hover:bg-accent"><User className="size-4" /> {t('الملف الشخصي')}</button>
                    <button onClick={() => { audit('تسجيل خروج من لوحة التحكم', 'المصادقة', 'خروج'); logout(); navigate('/login') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-[13px] font-bold text-destructive hover:bg-destructive/10"><LogOut className="size-4" /> {t('تسجيل الخروج')}</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 lg:p-6"><Outlet /></main>
      </div>
    </div>
  )
}


