import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { ColumnDef } from '@tanstack/react-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { DataTable } from '@/components/tables/data-table'
import { StatusBadge, ConfirmDialog, selectCls } from '@/components/common'
import { MerchantFormDialog, MerchantDetailDialog } from './merchant-dialogs'
import { merchantService, storageStatus } from '@/services/merchant.service'
import { useAuthStore } from '@/store/auth-store'
import { useDebouncedValue } from '@/hooks/use-debounce'
import { arDate, downloadCSV, initials } from '@/lib/utils'
import type { Merchant } from '@/types'
import { MoreHorizontal, Plus, Search } from 'lucide-react'

export default function MerchantsPage() {
  const qc = useQueryClient()
  const can = useAuthStore(s => s.can)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [join, setJoin] = useState('')
  const [page, setPage] = useState(1)
  const dq = useDebouncedValue(q, 300)
  const qp = useMemo(() => ({ q: dq, status, join, page, pageSize: 10 }), [dq, status, join, page])
  const { data, isLoading } = useQuery({ queryKey: ['merchants', qp], queryFn: () => merchantService.list(qp) })

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Merchant | null>(null)
  const [viewing, setViewing] = useState<Merchant | null>(null)
  const [deleting, setDeleting] = useState<Merchant | null>(null)

  const invalidate = () => qc.invalidateQueries({ queryKey: ['merchants'] })
  const toggleStatus = useMutation({ mutationFn: (id: string) => merchantService.setStatus(id), onSuccess: () => { toast.success('تم تغيير حالة التاجر بنجاح'); invalidate() } })
  const removeMut = useMutation({ mutationFn: (id: string) => merchantService.remove(id), onSuccess: () => { toast.success('تم حذف التاجر بنجاح'); invalidate(); setDeleting(null) } })

  const columns: ColumnDef<Merchant, unknown>[] = [
    { id: 'name', header: 'التاجر', cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <Avatar className="size-8 rounded-md"><AvatarFallback className="rounded-md bg-foreground text-xs font-extrabold text-background">{initials(row.original.first + ' ' + row.original.last)}</AvatarFallback></Avatar>
        <div><p className="font-bold">{row.original.first} {row.original.last}</p><p className="text-[11px] font-semibold text-muted-foreground">{row.original.id}</p></div>
      </div>) },
    { accessorKey: 'store', header: 'المتجر' },
    { accessorKey: 'email', header: 'البريد الإلكتروني' },
    { id: 'phone', header: 'الجوال', cell: ({ row }) => <span dir="ltr">{row.original.phone}</span> },
    { id: 'storage', header: 'التخزين', cell: ({ row }) => { const m = row.original; const pct = m.limit ? Math.min(100, Math.round((m.used / m.limit) * 100)) : 0; return (
      <div className="flex items-center gap-2">
        <div className="flex h-2 w-16 overflow-hidden rounded-full bg-muted"><div className={'h-full ' + (storageStatus(m.used, m.limit) === 'متجاوز' ? 'bg-destructive' : storageStatus(m.used, m.limit) === 'تحذير' ? 'bg-warning' : 'bg-foreground')} style={{ width: pct + '%' }} /></div>
        <span className="text-[11px] font-bold text-muted-foreground">{pct}%</span>
      </div>) } },
    { id: 'created', header: 'تاريخ الإنشاء', cell: ({ row }) => arDate(row.original.created) },
    { id: 'status', header: 'الحالة', cell: ({ row }) => <StatusBadge value={row.original.status} /> },
    { id: 'join', header: 'الانضمام', cell: ({ row }) => <StatusBadge value={row.original.join} /> },
    { id: 'actions', header: 'إجراءات', cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex size-8 items-center justify-center rounded-md border border-input bg-background hover:bg-accent" aria-label="إجراءات">
          <MoreHorizontal className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewing(row.original)}>عرض التفاصيل</DropdownMenuItem>
          {can('merchants.update') && <DropdownMenuItem onClick={() => { setEditing(row.original); setFormOpen(true) }}>تعديل</DropdownMenuItem>}
          {can('merchants.update') && <DropdownMenuItem onClick={() => toggleStatus.mutate(row.original.id)}>{row.original.status === 'نشط' ? 'إيقاف' : 'تفعيل'}</DropdownMenuItem>}
          {can('merchants.delete') && <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleting(row.original)}>حذف</DropdownMenuItem>}
        </DropdownMenuContent>
      </DropdownMenu>) },
  ]

  return (
    <div className="rounded-xl border bg-card shadow-sm">
      <DataTable
        columns={columns}
        data={data?.rows ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={10}
        onPageChange={setPage}
        loading={isLoading}
        getRowId={r => r.id}
        toolbar={
          <div className="flex flex-wrap items-center gap-2 border-b p-3">
            <div className="relative min-w-[220px] flex-1 md:max-w-xs">
              <Search className="absolute end-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input value={q} onChange={e => { setQ(e.target.value); setPage(1) }} placeholder="بحث: اسم المتجر، التاجر، البريد، الجوال..." className="pe-9" aria-label="بحث في التجار" />
            </div>
            <select className={selectCls} value={status} onChange={e => { setStatus(e.target.value); setPage(1) }} aria-label="تصفية حسب الحالة">
              <option value="">كل الحالات</option>
              <option value="نشط">نشط</option>
              <option value="موقوف">موقوف</option>
            </select>
            <select className={selectCls} value={join} onChange={e => { setJoin(e.target.value); setPage(1) }} aria-label="تصفية حسب الانضمام">
              <option value="">كل حالات الانضمام</option>
              <option value="منضم">منضم</option>
              <option value="غير منضم بعد">غير منضم بعد</option>
            </select>
            <div className="ms-auto flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { downloadCSV('merchants', ['اسم المتجر', 'الاسم', 'البريد', 'الجوال', 'الحالة', 'الانضمام', 'تاريخ الإنشاء'], (data?.rows ?? []).map(m => [m.store, m.first + ' ' + m.last, m.email, m.phone, m.status, m.join, m.created])); toast.success('تم تصدير الملف بنجاح') }}>تصدير</Button>
              {can('merchants.create') && <Button size="sm" onClick={() => { setEditing(null); setFormOpen(true) }}><Plus className="size-4" /> إنشاء تاجر</Button>}
            </div>
          </div>
        }
      />

      <MerchantFormDialog open={formOpen} onOpenChange={setFormOpen} merchant={editing} onSaved={invalidate} />
      <MerchantDetailDialog merchant={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={v => { if (!v) setDeleting(null) }}
        destructive
        loading={removeMut.isPending}
        title="حذف التاجر"
        description={<>هل أنت متأكد من حذف التاجر <b>{deleting?.first} {deleting?.last}</b> ({deleting?.store})؟<br /><span className="font-bold text-destructive">سيتم حذف جميع بيانات التاجر من قاعدة البيانات ولا يمكن التراجع.</span></>}
        confirmLabel="تأكيد الحذف"
        onConfirm={() => removeMut.mutate(deleting!.id)}
      />
    </div>
  )
}

