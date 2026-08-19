// src/components/tables/data-table.tsx
import { useMemo, useState } from 'react'
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/common'
import { paginationRange } from '@/lib/utils'
import { useT } from '@/lib/i18n'
import { usePrefsStore } from '@/store/prefs-store'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[]
  data: T[]
  total: number
  page: number
  pageSize?: number
  onPageChange: (p: number) => void
  loading?: boolean
  toolbar?: React.ReactNode
  getRowClassName?: (row: T) => string
  getRowId?: (row: T) => string
  emptyTitle?: string
  selectable?: boolean
  bulkActions?: (selectedIds: string[], clear: () => void) => React.ReactNode
}

export function DataTable<T>({ columns, data, total, page, pageSize = 10, onPageChange, loading, toolbar, getRowClassName, getRowId, emptyTitle, selectable, bulkActions }: DataTableProps<T>) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({})
  const t = useT()
  const lang = usePrefsStore(s => s.lang)
  const isRtl = lang === 'ar'
  const getId = (r: T) => (getRowId ? getRowId(r) : String((r as { id?: string }).id ?? ''))

  const allColumns = useMemo<ColumnDef<T, unknown>[]>(() => {
    if (!selectable) return columns
    const sel: ColumnDef<T, unknown> = {
      id: '_select',
      header: () => {
        const all = data.length > 0 && data.every(r => rowSelection[getId(r)])
        return <input type="checkbox" className="size-4 accent-[#0a0a0a]" checked={all} onChange={e => { const next: Record<string, boolean> = {}; if (e.target.checked) data.forEach(r => { next[getId(r)] = true }); setRowSelection(next) }} aria-label={t('تحديد الكل')} />
      },
      cell: ({ row }) => <input type="checkbox" className="size-4 accent-[#0a0a0a]" checked={!!rowSelection[getId(row.original)]} onChange={e => setRowSelection(s => ({ ...s, [getId(row.original)]: e.target.checked }))} aria-label={t('تحديد الصف')} />,
    }
    return [sel, ...columns]
  }, [columns, selectable, rowSelection, data, t])

  const table = useReactTable({ data, columns: allColumns, getCoreRowModel: getCoreRowModel(), manualPagination: true, pageCount: Math.ceil(total / pageSize), getRowId: r => getId(r) })
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const selectedIds = selectable ? data.filter(r => rowSelection[getId(r)]).map(getId) : []
  const clear = () => setRowSelection({})

  const PrevIcon = isRtl ? ChevronRight : ChevronLeft
  const NextIcon = isRtl ? ChevronLeft : ChevronRight

  const fromRecord = (page - 1) * pageSize + 1
  const toRecord = Math.min(page * pageSize, total)
  const paginationSummary = total === 0
    ? (lang === 'en' ? 'Showing 0 of 0 records' : 'عرض 0 من 0 سجل')
    : (lang === 'en' ? `Showing ${fromRecord}–${toRecord} of ${total} records` : `عرض ${fromRecord}–${toRecord} من ${total} سجل`)

  return (
    <div>
      {toolbar}
      {selectable && selectedIds.length > 0 && bulkActions && (
        <div className="flex flex-wrap items-center gap-3 border-b bg-muted/60 px-4 py-2 text-sm font-bold">
          {bulkActions(selectedIds, clear)}
        </div>
      )}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg => (
              <TableRow key={hg.id}>
                {hg.headers.map(h => (
                  <TableHead key={h.id} className="whitespace-nowrap text-xs font-extrabold text-muted-foreground">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: Math.min(pageSize, 8) }).map((_, i) => (
                <TableRow key={i}>{allColumns.map((_, j) => <TableCell key={j}><Skeleton className="h-8 w-full" /></TableCell>)}</TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow><TableCell colSpan={allColumns.length}><EmptyState title={emptyTitle ?? 'لا توجد سجلات مطابقة'} /></TableCell></TableRow>
            ) : (
              table.getRowModel().rows.map(row => (
                <TableRow key={row.id} className={getRowClassName?.(row.original)}>
                  {row.getVisibleCells().map(cell => (
                    <TableCell key={cell.id} className="whitespace-nowrap">{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs font-semibold text-muted-foreground">
        <span>{paginationSummary}</span>
        <nav className="flex items-center gap-1" aria-label={t('ترقيم الصفحات')}>
          <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label={t('الصفحة السابقة')} title={t('الصفحة السابقة')}><PrevIcon className="size-4" /></Button>
          {paginationRange(pageCount, page).map((p, i) => p === '…'
            ? <span key={'e' + i} className="px-1">…</span>
            : <Button key={p} variant={p === page ? 'default' : 'outline'} size="icon" className="size-8" onClick={() => onPageChange(p)}>{p}</Button>)}
          <Button variant="outline" size="icon" className="size-8" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} aria-label={t('الصفحة التالية')} title={t('الصفحة التالية')}><NextIcon className="size-4" /></Button>
        </nav>
      </div>
    </div>
  )
}
