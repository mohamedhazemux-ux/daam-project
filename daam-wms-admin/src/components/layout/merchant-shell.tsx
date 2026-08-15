import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/auth-store'
import { useUIStore } from '@/store/ui-store'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent } from '@/components/ui/sheet'
import { NotificationsPopover } from './notifications-popover'
import { audit } from '@/services/audit.service'
import { cn, initials } from '@/lib/utils'
import { BrandLogo } from '@/components/brand-logo'
import { useT } from '@/lib/i18n'
import { LayoutDashboard, ShoppingCart, Package, Layers, Undo2, Wallet, Wrench, Bell, Menu, LogOut, User, BarChart3, Settings, type LucideIcon } from 'lucide-react'
const TITLES: Record<string, string> = { '/merchant': 'لوحة التحكم', '/merchant/orders': 'الطلبات', '/merchant/products': 'المنتجات', '/merchant/inventory': 'المخزون', '/merchant/returns': 'المرتجعات', '/merchant/wallet': 'المحفظة والمالية', '/merchant/services': 'طلبات الخدمة', '/merchant/notifications': 'مركز الإشعارات', '/merchant/profile': 'الملف الشخصي', '/merchant/reports': 'التقارير والتحليلات', '/merchant/settings': 'الإعدادات' }
const NAV: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/merchant', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/merchant/orders', label: 'الطلبات', icon: ShoppingCart },
  { to: '/merchant/products', label: 'المنتجات', icon: Package },
  { to: '/merchant/inventory', label: 'المخزون', icon: Layers },
  { to: '/merchant/returns', label: 'المرتجعات', icon: Undo2 },
  { to: '/merchant/wallet', label: 'المحفظة والمالية', icon: Wallet },
  { to: '/merchant/services', label: 'طلبات الخدمة', icon: Wrench },
  { to: '/merchant/notifications', label: 'مركز الإشعارات', icon: Bell },
  { to: '/merchant/reports', label: 'التقارير والتحليلات', icon: BarChart3 },
  { to: '/merchant/settings', label: 'الإعدادات', icon: Settings },
]
function SidebarContent() {
  const t = useT()
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-5 py-4"><BrandLogo /></div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="تنقل بوابة التاجر">
        {NAV.map(it => (
          <NavLink key={it.to} to={it.to} end={it.to === '/merchant'} className={({ isActive }) => cn('mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground', isActive && 'bg-foreground text-background hover:bg-foreground hover:text-background')}>
            <it.icon className="size-[18px] shrink-0" aria-hidden />
            <span className="flex-1">{t(it.label)}</span>
          </NavLink>
        ))}
      </nav>
      <div className="border-t px-4 py-3 text-[11px] font-bold text-muted-foreground">بوابة التجار — الإصدار 2.0</div>
    </div>
  )
}
export function MerchantShell() {
  const { sidebarOpen, toggleSidebar, closeSidebar } = useUIStore()
  const user = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const location = useLocation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const t = useT()
  const title = TITLES[location.pathname] ?? 'لوحة التحكم'
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[262px] shrink-0 border-e bg-card lg:block"><SidebarContent /></aside>
      <Sheet open={sidebarOpen} onOpenChange={v => { if (!v) closeSidebar() }}>
        <SheetContent side="left" className="w-[280px] p-0"><SidebarContent /></SheetContent>
      </Sheet>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card px-4 lg:px-6">
          <Button variant="outline" size="icon" className="lg:hidden" onClick={toggleSidebar} aria-label="فتح القائمة"><Menu className="size-4" /></Button>
          <div className="min-w-0">
            <h1 className="truncate text-[15px] font-extrabold">{t(title)}</h1>
            <p className="hidden text-[11px] font-semibold text-muted-foreground sm:block">{user?.store} / {title}</p>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <NotificationsPopover />
            <div className="relative">
              <button onClick={() => setMenuOpen(o => !o)} className="inline-flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent" aria-label="قائمة الحساب">
                <Avatar className="size-8"><AvatarFallback className="bg-foreground text-background">{initials(user?.name ?? '')}</AvatarFallback></Avatar>
                <span className="hidden text-[13px] font-extrabold md:block">{user?.name}</span>
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                  <div className="absolute end-0 z-50 mt-2 w-56 rounded-xl border bg-card p-2 shadow-lg">
                    <p className="border-b px-2 pb-2 pt-1 text-xs font-bold text-muted-foreground">{user?.email}</p>
                    <button onClick={() => { setMenuOpen(false); navigate('/merchant/profile') }} className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-[13px] font-bold hover:bg-accent"><User className="size-4" /> الملف الشخصي</button>
                    <button onClick={() => { audit('تسجيل خروج تاجر', 'المصادقة', 'خروج'); logout(); navigate('/merchant/login') }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start text-[13px] font-bold text-destructive hover:bg-destructive/10"><LogOut className="size-4" /> تسجيل الخروج</button>
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





