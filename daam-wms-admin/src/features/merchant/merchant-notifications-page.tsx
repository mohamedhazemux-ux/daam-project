import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/tables/data-table'
import { StatusBadge, selectCls } from '@/components/common'
import { merchantNotificationsService, type MNotif } from '@/services/merchant-notifications.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { Search } from 'lucide-react'
export default function MerchantNotificationsPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, type, page, pageSize: 10 }), [dq, type, page])
  const { data, isLoading } = useQuery({ queryKey: ['m-notifs', qp], queryFn: () => merchantNotificationsService.list(qp), refetchInterval: 60_000 })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['m-notifs'] })
  const markAll = useMutation({ mutationFn: () => merchantNotificationsService.markAllRead(), onSuccess: () => { toast.success('تم تحديد جميع الإشعارات كمقروءة'); invalidate() } })
  const columns = [
    { accessorKey: 'title', header: 'العنوان', cell: ({ row }: any) => <b>{row.original.title}</b> },
    { accessorKey: 'msg', header: 'الرسالة', cell: ({ row }: any) => <span className="block max-w-[380px] truncate">{row.original.msg.length > 100 ? row.original.msg.slice(0, 100) + '…' : row.original.msg}</span> },
    { id: 'type', header: 'النوع', cell: ({ row }: any) => <StatusBadge value={row.original.type} /> },
    { accessorKey: 'ref', header: 'المرجع المرتبط', cell: ({ row }: any) => row.original.ref ?? '—' },
    { id: 'read', header: 'حالة القراءة', cell: ({ row }: any) => row.original.unread ? <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-extrabold text-blue-700">غير مقروء</span> : <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-600">مقروء</span> },
    { accessorKey: 'time', header: 'تم الاستلام في' },
    { id: 'actions', header: 'إجراءات', cell: ({ row }: any) => (
      <div className="flex gap-1">
        {row.original.unread && <Button size="sm" variant="outline" onClick={() => { merchantNotificationsService.markRead(row.original.id); invalidate() }}>تحديد كمقروء</Button>}
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { merchantNotificationsService.remove(row.original.id); invalidate(); toast.success('تم حذف الإشعار') }}>حذف</Button>
      </div>) },
  ] as ColumnDef<any, unknown>[]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={(r: any) => r.id}
        emptyTitle="لا توجد إشعارات"
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[200px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث في الإشعارات..." className="pe-9" aria-label="بحث في الإشعارات" />
            </div>
            <select className={selectCls} value={type} onChange={e => { setType(e.target.value); setPage(1) }} aria-label="تصفية حسب النوع">
              <option value="">كل الأنواع</option>
              {['معلومات', 'نجاح', 'تحذير', 'تنبيه'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => markAll.mutate()}>تحديد الكل كمقروء</Button>
          </div>
        } />
    </div>
  )
}
