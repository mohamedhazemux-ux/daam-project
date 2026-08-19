import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/tables/data-table'
import { ActionButtons, Modal, StatusBadge, selectCls } from '@/components/common'
import { systemService } from '@/services/system.service'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { downloadCSV } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import type { AuditLog } from '@/types'
import { Eye, Search } from 'lucide-react'
const TYPES = ['دخول', 'خروج', 'إنشاء', 'تعديل', 'حذف', 'اعتماد', 'رفض', 'تصدير', 'تنبيه أمني', 'إجراء']
export default function AuditLogsPage() {
  const t = useT()
  const [q, setQ] = useState(''); const [type, setType] = useState(''); const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, type, page, pageSize: 10 }), [dq, type, page])
  const { data, isLoading } = useQuery({ queryKey: ['logs', qp], queryFn: () => systemService.logs(qp) })
  const [viewing, setViewing] = useState<AuditLog | null>(null)
  const columns: ColumnDef<AuditLog, unknown>[] = [
    { accessorKey: 'id', header: t('المعرف'), cell: ({ row }) => <span dir="ltr" className="text-xs font-bold">{row.original.id}</span> },
    { id: 'type', header: t('النوع'), cell: ({ row }) => <StatusBadge value={row.original.type === 'تنبيه أمني' ? 'حرج' : 'اعتيادي'} className="me-1" /> },
    { id: 'actor', header: t('المنفذ'), cell: ({ row }) => <div><p className="font-bold">{row.original.actor}</p><p className="text-[11px] text-muted-foreground">{row.original.role} — {row.original.email}</p></div> },
    { accessorKey: 'desc', header: t('الوصف'), cell: ({ row }) => <span className="block max-w-[320px] truncate">{row.original.desc}</span> },
    { accessorKey: 'entity', header: t('الكيان المرتبط') },
    { accessorKey: 'ip', header: 'IP', cell: ({ row }) => <span dir="ltr">{row.original.ip}</span> },
    { accessorKey: 'time', header: t('الوقت') },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => (
      <ActionButtons actions={[
        { icon: Eye, label: 'عرض تفاصيل السجل', onClick: () => setViewing(row.original) },
      ]} />) },
  ]
  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable columns={columns} data={data?.rows ?? []} total={data?.total ?? 0} page={page} pageSize={10} onPageChange={setPage} loading={isLoading} getRowId={r => r.id}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder={t('بحث في السجلات...')} className="pe-9" aria-label={t('بحث في السجلات')} />
            </div>
            <select className={selectCls} value={type} onChange={e => { setType(e.target.value); setPage(1) }} aria-label={t('تصفية حسب النوع')}>
              <option value="">{t('كل الأنواع')}</option>
              {TYPES.map(tp => <option key={tp} value={tp}>{t(tp)}</option>)}
            </select>
            <p className="text-xs font-semibold text-muted-foreground">{t('الاحتفاظ بالسجلات 365 يومًا مع الأرشفة التلقائية')}</p>
            <Button variant="outline" size="sm" className="ms-auto" onClick={() => { downloadCSV('system-logs', ['المعرف', 'النوع', 'المنفذ', 'الدور', 'الوصف', 'الكيان', 'الوقت', 'IP'], (data?.rows ?? []).map(l => [l.id, l.type, l.actor, l.role, l.desc, l.entity, l.time, l.ip])); toast.success(t('تم تصدير السجلات بنجاح')) }}>{t('تصدير')}</Button>
          </div>
        } />
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={t('تفاصيل السجل — ') + (viewing?.id ?? '')} footer={<Button variant="outline" onClick={() => setViewing(null)}>{t('إغلاق')}</Button>}>
        <pre dir="ltr" className="max-h-80 overflow-auto rounded-lg bg-muted p-4 text-xs">{JSON.stringify(viewing, null, 2)}</pre>
      </Modal>
    </div>
  )
}
