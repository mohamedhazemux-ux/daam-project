import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/tables/data-table'
import { StatusBadge, selectCls } from '@/components/common'
import { systemService } from '@/services/system.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { Search } from 'lucide-react'
import type { ColumnDef } from '@tanstack/react-table'
import type { AppNotification } from '@/types'
export default function NotificationsPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState(''); const [type, setType] = useState(''); const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, type, page, pageSize: 10 }), [dq, type, page])
  const { data, isLoading } = useQuery({ queryKey: ['notifications', qp], queryFn: () => systemService.notifications(qp) })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['notifications'] })
  const readAll = useMutation({ mutationFn: () => systemService.markAllRead(), onSuccess: () => { toast.success('تم تحديد جميع الإشعارات كمقروءة'); invalidate() } })
  const columns: ColumnDef<AppNotification, unknown>[] = [
    { accessorKey: 'title', header: 'العنوان', cell: ({ row }) => <b>{row.original.title}</b> },
    { accessorKey: 'msg', header: 'الرسالة', cell: ({ row }) => <span className="block max-w-[380px] truncate">{row.original.msg}</span> },
    { id: 'type', header: 'النوع', cell: ({ row }) => <StatusBadge value={row.original.type} /> },
    { accessorKey: 'time', header: 'الوقت' },
    { id: 'read', header: 'الحالة', cell: ({ row }) => row.original.unread ? <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-extrabold text-blue-700">غير مقروء</span> : <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-extrabold text-slate-600">مقروء</span> },
    { id: 'actions', header: 'إجراءات', cell: ({ row }) => (
      <div className="flex gap-1">
        {row.original.unread && <Button size="sm" variant="outline" onClick={() => { systemService.markRead(row.original.id); invalidate() }}>تحديد كمقروء</Button>}
        <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => { systemService.removeNotification(row.original.id); invalidate(); toast.success('تم حذف الإشعار') }}>حذف</Button>
      </div>) },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.id}
        emptyTitle="لا توجد إشعارات"
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث في الإشعارات..." className="pe-9" aria-label="بحث في الإشعارات" />
            </div>
            <select className={selectCls} value={type} onChange={e => { setType(e.target.value); setPage(1) }} aria-label="تصفية حسب النوع">
              <option value="">كل الأنواع</option>
              {['تحذير', 'نجاح', 'موافقة', 'تنبيه'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => readAll.mutate()}>تحديد الكل كمقروء</Button>
          </div>
        } />
    </div>
  )
}
