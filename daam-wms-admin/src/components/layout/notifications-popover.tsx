import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { systemService } from '@/services/system.service'
import { merchantNotificationsService } from '@/services/merchant-notifications.service'
import { Bell } from 'lucide-react'
import { getNotificationRoute } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { useAuthStore } from '@/store/auth-store'

type NotificationPreview = { id: string; title: string; msg: string; unread: boolean }
export function NotificationsPopover() {
  const t = useT()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const qc = useQueryClient()
  const isMerchant = location.pathname.startsWith('/merchant')
  const store = useAuthStore(s => s.user?.store)
  const { data } = useQuery<{ rows: NotificationPreview[]; total: number }>({
    queryKey: isMerchant ? ['m-notif-pop', store] : ['notif-pop'],
    queryFn: async () => isMerchant
      ? merchantNotificationsService.list({ page: 1, pageSize: 100, store })
      : systemService.notifications({ page: 1, pageSize: 100 }),
    refetchInterval: 60_000,
  })
  const rows = data?.rows ?? []
  const unread = rows.filter(n => n.unread).length
  const allPath = isMerchant ? '/merchant/notifications' : '/notifications'
  const markRead = (id: string) => {
    if (isMerchant) merchantNotificationsService.markRead(id)
    else systemService.markRead(id)
    qc.invalidateQueries({ queryKey: isMerchant ? ['m-notif-pop'] : ['notif-pop'] })
    qc.invalidateQueries({ queryKey: ['m-notifs'] })
    qc.invalidateQueries({ queryKey: ['notifications'] })
  }
  return (
    <div className="relative">
      <button onClick={() => setOpen(o => !o)} className="relative inline-flex size-9 items-center justify-center rounded-md border border-input bg-background hover:bg-accent" aria-label={t('الإشعارات')}>
        <Bell className="size-4" />
        {unread > 0 && <span className="absolute -top-1 -start-1 flex size-4 items-center justify-center rounded-full bg-destructive text-[9px] font-black text-white">{unread}</span>}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute end-0 z-50 mt-2 w-80 rounded-xl border bg-card shadow-lg">
            <div className="max-h-80 overflow-y-auto p-2">
              {rows.length === 0 ? (
                <p className="p-4 text-center text-xs font-bold text-muted-foreground">{t('لا توجد إشعارات')}</p>
              ) : (
                rows.slice(0, 10).map(n => (
                  <button key={n.id} onClick={() => {
                    markRead(n.id)
                    setOpen(false)
                    navigate(getNotificationRoute(n, isMerchant))
                  }} className="mb-1 w-full rounded-lg border p-2 text-start hover:bg-accent">
                    <p className="text-[12px] font-extrabold">{n.title}</p>
                    <p className="truncate text-[11px] font-semibold text-muted-foreground">{n.msg}</p>
                  </button>
                ))
              )}
            </div>
            <div className="border-t p-2">
              <Button variant="outline" size="sm" className="w-full" onClick={() => { setOpen(false); navigate(allPath) }}>{t('عرض جميع الإشعارات')}</Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
