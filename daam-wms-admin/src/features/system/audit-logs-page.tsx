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
    { id: 'type', header: t('النوع'), cell: ({ row }) => <div className="flex items-center gap-1"><StatusBadge value={row.original.type === 'تنبيه أمني' ? 'حرج' : 'اعتيادي'} className="me-1" /><span className="text-xs font-bold">{t(row.original.type)}</span></div> },
    { id: 'actor', header: t('المنفذ'), cell: ({ row }) => <div><p className="font-bold">{t(row.original.actor)}</p><p className="text-[11px] text-muted-foreground">{t(row.original.role)} — {row.original.email}</p></div> },
    { id: 'desc', header: t('الوصف'), cell: ({ row }) => <span className="block max-w-[320px] truncate">{t(row.original.desc)}</span> },
    { id: 'entity', header: t('الكيان المرتبط'), cell: ({ row }) => t(row.original.entity) },
    { accessorKey: 'ip', header: 'IP', cell: ({ row }) => <span dir="ltr">{row.original.ip}</span> },
    { accessorKey: 'time', header: t('الوقت'), cell: ({ row }) => <span className="text-xs font-semibold">{t(row.original.time)}</span> },
    { id: 'actions', header: t('إجراءات'), cell: ({ row }) => (
      <ActionButtons actions={[
        { icon: Eye, label: t('عرض تفاصيل السجل'), onClick: () => setViewing(row.original) },
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
      <Modal open={!!viewing} onClose={() => setViewing(null)} title={t('تفاصيل السجل') + ' — ' + (viewing?.id ?? '')} footer={<Button variant="outline" onClick={() => setViewing(null)}>{t('إغلاق')}</Button>}>
        {viewing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                [t('المعرف'), viewing.id],
                [t('النوع'), t(viewing.type)],
                [t('المنفذ'), t(viewing.actor)],
                [t('الدور'), t(viewing.role)],
                [t('البريد الإلكتروني'), viewing.email],
                [t('الكيان المرتبط'), t(viewing.entity)],
                [t('الوقت'), t(viewing.time)],
                ['IP', viewing.ip],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border bg-muted/40 px-3 py-2">
                  <p className="text-[11px] font-bold text-muted-foreground">{k}</p>
                  <p className="text-[13px] font-extrabold">{v}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="mb-1 text-[11px] font-bold text-muted-foreground">{t('الوصف')}</p>
              <div className="rounded-lg border bg-muted/40 p-3 text-sm font-semibold">
                {t(viewing.desc)}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
