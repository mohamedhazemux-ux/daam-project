// src/components/layout/breadcrumbs.tsx
import { Link, useLocation } from 'react-router-dom'
import { useT } from '@/lib/i18n'
import { usePrefsStore } from '@/store/prefs-store'
import { ChevronLeft, ChevronRight, Home } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  to?: string
}

interface RouteMapping {
  section: string
  title: string
  to: string
}

const ADMIN_ROUTES: Record<string, RouteMapping> = {
  '/': { section: 'الرئيسية', title: 'لوحة التحكم', to: '/' },
  '/approvals': { section: 'الرئيسية', title: 'الموافقات', to: '/approvals' },
  '/merchants': { section: 'الإدارة', title: 'التجار', to: '/merchants' },
  '/platform-products': { section: 'الإدارة', title: 'منتجات المنصة', to: '/platform-products' },
  '/inventory/requests': { section: 'المخزون', title: 'طلبات المخزون', to: '/inventory/requests' },
  '/inventory/levels': { section: 'المخزون', title: 'مستويات المخزون', to: '/inventory/levels' },
  '/inventory/storage': { section: 'المخزون', title: 'استخدام التخزين', to: '/inventory/storage' },
  '/orders': { section: 'العمليات', title: 'الطلبات', to: '/orders' },
  '/returns': { section: 'العمليات', title: 'المرتجعات', to: '/returns' },
  '/finance/withdrawals': { section: 'المالية', title: 'طلبات السحب', to: '/finance/withdrawals' },
  '/finance/wallets': { section: 'المالية', title: 'المحافظ', to: '/finance/wallets' },
  '/finance/invoices': { section: 'المالية', title: 'الفواتير', to: '/finance/invoices' },
  '/services/requests': { section: 'الخدمات', title: 'طلبات الخدمة', to: '/services/requests' },
  '/services/subscriptions': { section: 'الخدمات', title: 'الاشتراكات', to: '/services/subscriptions' },
  '/services/types': { section: 'الخدمات', title: 'أنواع الخدمات', to: '/services/types' },
  '/reports': { section: 'النظام', title: 'التقارير', to: '/reports' },
  '/settings': { section: 'النظام', title: 'الإعدادات', to: '/settings' },
  '/logs': { section: 'النظام', title: 'السجلات', to: '/logs' },
  '/notifications': { section: 'النظام', title: 'الإشعارات', to: '/notifications' },
  '/profile': { section: 'الحساب', title: 'الملف الشخصي', to: '/profile' },
}

const RECORD_KIND_MAP: Record<string, { section: string; pageTitle: string; listPath: string }> = {
  order: { section: 'العمليات', pageTitle: 'الطلبات', listPath: '/orders' },
  merchant: { section: 'الإدارة', pageTitle: 'التجار', listPath: '/merchants' },
  withdrawal: { section: 'المالية', pageTitle: 'طلبات السحب', listPath: '/finance/withdrawals' },
  invoice: { section: 'المالية', pageTitle: 'الفواتير', listPath: '/finance/invoices' },
  return: { section: 'العمليات', pageTitle: 'المرتجعات', listPath: '/returns' },
  'stock-request': { section: 'المخزون', pageTitle: 'طلبات المخزون', listPath: '/inventory/requests' },
  'service-request': { section: 'الخدمات', pageTitle: 'طلبات الخدمة', listPath: '/services/requests' },
  approval: { section: 'الرئيسية', pageTitle: 'الموافقات', listPath: '/approvals' },
}

const MERCHANT_ROUTES: Record<string, RouteMapping> = {
  '/merchant': { section: 'الرئيسية', title: 'لوحة التحكم', to: '/merchant' },
  '/merchant/products': { section: 'المخزون', title: 'المنتجات', to: '/merchant/products' },
  '/merchant/inventory': { section: 'المخزون', title: 'مستويات المخزون', to: '/merchant/inventory/levels' },
  '/merchant/inventory/levels': { section: 'المخزون', title: 'مستويات المخزون', to: '/merchant/inventory/levels' },
  '/merchant/inventory/requests': { section: 'المخزون', title: 'طلبات المخزون', to: '/merchant/inventory/requests' },
  '/merchant/inventory/storage': { section: 'المخزون', title: 'استخدام التخزين', to: '/merchant/inventory/storage' },
  '/merchant/orders': { section: 'العمليات', title: 'الطلبات', to: '/merchant/orders' },
  '/merchant/returns': { section: 'العمليات', title: 'المرتجعات', to: '/merchant/returns' },
  '/merchant/wallet': { section: 'المالية', title: 'المحفظة', to: '/merchant/finance/wallet' },
  '/merchant/finance/wallet': { section: 'المالية', title: 'المحفظة', to: '/merchant/finance/wallet' },
  '/merchant/finance/withdrawals': { section: 'المالية', title: 'طلبات السحب', to: '/merchant/finance/withdrawals' },
  '/merchant/finance/invoices': { section: 'المالية', title: 'الفواتير', to: '/merchant/finance/invoices' },
  '/merchant/services': { section: 'الخدمات', title: 'طلبات الخدمة', to: '/merchant/services/requests' },
  '/merchant/services/requests': { section: 'الخدمات', title: 'طلبات الخدمة', to: '/merchant/services/requests' },
  '/merchant/services/subscriptions': { section: 'الخدمات', title: 'الاشتراكات', to: '/merchant/services/subscriptions' },
  '/merchant/reports': { section: 'النظام', title: 'التقارير', to: '/merchant/reports' },
  '/merchant/settings': { section: 'النظام', title: 'الإعدادات', to: '/merchant/settings' },
  '/merchant/notifications': { section: 'النظام', title: 'الإشعارات', to: '/merchant/notifications' },
  '/merchant/profile': { section: 'الحساب', title: 'الملف الشخصي', to: '/merchant/profile' },
}

export function Breadcrumbs({ portal = 'admin' }: { portal?: 'admin' | 'merchant' }) {
  const location = useLocation()
  const lang = usePrefsStore(s => s.lang)
  const t = useT()
  const path = location.pathname

  const items: BreadcrumbItem[] = []
  const isRtl = lang === 'ar'
  const SepIcon = isRtl ? ChevronLeft : ChevronRight

  if (portal === 'merchant') {
    items.push({ label: 'الرئيسية', to: '/merchant' })
    if (path.startsWith('/merchant/records/')) {
      const parts = path.split('/')
      const kind = parts[3]
      const recordId = parts[4]
      const merchantKindMap: Record<string, { section: string; pageTitle: string; listPath: string }> = {
        order: { section: 'العمليات', pageTitle: 'الطلبات', listPath: '/merchant/orders' },
        product: { section: 'المخزون', pageTitle: 'المنتجات', listPath: '/merchant/products' },
        return: { section: 'العمليات', pageTitle: 'المرتجعات', listPath: '/merchant/returns' },
        'stock-request': { section: 'المخزون', pageTitle: 'طلبات المخزون', listPath: '/merchant/inventory/requests' },
        'service-request': { section: 'الخدمات', pageTitle: 'طلبات الخدمة', listPath: '/merchant/services/requests' },
        withdrawal: { section: 'المالية', pageTitle: 'طلبات السحب', listPath: '/merchant/finance/withdrawals' },
        invoice: { section: 'المالية', pageTitle: 'الفواتير', listPath: '/merchant/finance/invoices' },
      }
      const kindInfo = merchantKindMap[kind]
      if (kindInfo) {
        if (kindInfo.section !== 'الرئيسية') {
          items.push({ label: kindInfo.section })
        }
        items.push({ label: kindInfo.pageTitle, to: kindInfo.listPath })
        if (recordId) {
          items.push({ label: decodeURIComponent(recordId) })
        }
      }
    } else {
      const matched = MERCHANT_ROUTES[path]
      if (matched) {
        if (matched.section !== 'الرئيسية') {
          items.push({ label: matched.section })
        }
        if (path !== '/merchant') {
          items.push({ label: matched.title })
        } else {
          items.push({ label: 'لوحة التحكم' })
        }
      }
    }
  } else {

    // Admin Portal
    items.push({ label: 'الرئيسية', to: '/' })

    if (path.startsWith('/records/')) {
      const parts = path.split('/')
      const kind = parts[2]
      const recordId = parts[3]
      const kindInfo = RECORD_KIND_MAP[kind]

      if (kindInfo) {
        items.push({ label: kindInfo.section })
        items.push({ label: kindInfo.pageTitle, to: kindInfo.listPath })
        if (recordId) {
          items.push({ label: decodeURIComponent(recordId) })
        }
      }
    } else {
      const matched = ADMIN_ROUTES[path]
      if (matched) {
        if (matched.section !== 'الرئيسية') {
          items.push({ label: matched.section })
        }
        if (path !== '/') {
          items.push({ label: matched.title })
        } else {
          items.push({ label: 'لوحة التحكم' })
        }
      }
    }
  }

  if (items.length <= 1 && path !== '/' && path !== '/merchant') return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Link
        to={portal === 'merchant' ? '/merchant' : '/'}
        className="inline-flex items-center gap-1 rounded-md p-1 hover:bg-accent hover:text-foreground transition-colors"
        title={t(portal === 'merchant' ? 'بوابة التجار' : 'الرئيسية')}
        aria-label={t(portal === 'merchant' ? 'بوابة التجار' : 'الرئيسية')}
      >
        <Home className="size-3.5" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <div key={index} className="flex items-center gap-1.5">
            <SepIcon className="size-3.5 shrink-0 opacity-50" aria-hidden />
            {item.to && !isLast ? (
              <Link
                to={item.to}
                className="font-medium hover:text-foreground hover:underline underline-offset-4 transition-colors"
              >
                {t(item.label)}
              </Link>
            ) : (
              <span className={isLast ? 'font-bold text-foreground truncate max-w-[200px]' : 'font-medium'}>
                {t(item.label)}
              </span>
            )}
          </div>
        )
      })}
    </nav>
  )
}
