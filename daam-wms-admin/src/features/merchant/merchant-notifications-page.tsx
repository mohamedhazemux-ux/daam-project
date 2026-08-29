import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/tables/data-table'
import { ActionButtons, StatusBadge, selectCls } from '@/components/common'
import { merchantNotificationsService, type MNotif } from '@/services/merchant-notifications.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { CheckCheck, Search, Trash2 } from 'lucide-react'
import { getNotificationRoute } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'
import { useT } from '@/lib/i18n'

export default function MerchantNotificationsPage() {
  const t = useT()
  const qc = useQueryClient()
  const store = useAuthStore(s => s.user?.store)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, type, page, pageSize: 10, store }), [dq, type, page, store])
  const { data, isLoading } = useQuery({ queryKey: ['m-notifs', qp], queryFn: () => merchantNotificationsService.list(qp), refetchInterval: 60_000 })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['m-notifs'] })
  const markAll = useMutation({ mutationFn: () => merchantNotificationsService.markAllRead(), onSuccess: () => { toast.success(t('تم تحديد جميع الإشعارات كمقروءة')); invalidate() } })
  const columns: ColumnDef<MNotif, unknown>[] = [
    { accessorKey: 'title', header: t('العنوان'), cell: ({ row }) => (
      <button
        onClick={() => {
          if (row.original.unread) {
            merchantNotificationsService.markRead(row.original.id)
            invalidate()
          }
          navigate(getNotificationRoute(row.original, true))
        }}
        className="font-bold text-start hover:underline text-blue-600 hover:text-blue-800"
      >
        {t(row.original.title)}
      </button>
    ) },
    { accessorKey: 'msg', header: t('الرسالة'), cell: ({ row }) => <span className="block max-w-[380px] truncate">{t(row.original.msg.length > 100 ? row.original.msg.slice(0, 100) + '…' : row.original.msg)}</span> },
    { id: 'type', header: t('النوع'), cell: ({ row }) => <StatusBadge value={row.original.type} /> },
    { accessorKey: 'ref', header: t('المرجع المرتبط'), cell: ({ row }) => row.original.ref ?? '—' },
    { id: 'read', header: t('حالة القراءة'), cell: ({ row }) => row.original.unread ? <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-extrabold text-blue-700">{t('غير مقروء')}</span> : <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-600">{t('مقروء')}</span> },
    { accessorKey: 'time', header: t('تم الاستلام في'), cell: ({ row }) => t(row.original.time) },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => (
      <ActionButtons actions={[
        { icon: CheckCheck, label: t('تحديد كمقروء'), onClick: () => { merchantNotificationsService.markRead(row.original.id); invalidate() }, hidden: !row.original.unread },
        { icon: Trash2, label: t('حذف الإشعار'), variant: 'destructive', onClick: () => { merchantNotificationsService.remove(row.original.id); invalidate(); toast.success(t('تم حذف الإشعار')) } },
      ]} />) },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.id}
        emptyTitle={t('لا توجد إشعارات')}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[200px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث في الإشعارات...')} className="pe-9" aria-label={t('بحث في الإشعارات')} />
            </div>
            <select className={selectCls} value={type} onChange={e => { setType(e.target.value); setPage(1) }} aria-label={t('تصفية حسب النوع')}>
              <option value="">{t('كل الأنواع')}</option>
              {['معلومات', 'نجاح', 'تحذير', 'تنبيه'].map(typeOption => <option key={typeOption} value={typeOption}>{t(typeOption)}</option>)}
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => markAll.mutate()}>{t('تحديد الكل كمقروء')}</Button>
          </div>
        } />
    </div>
  )
}
