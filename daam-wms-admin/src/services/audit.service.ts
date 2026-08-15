import { db } from '@/mocks/db'
import { nowStamp } from '@/lib/utils'
import { useAuthStore } from '@/store/auth-store'

/** سجل التدقيق — جاهز للاستبدال بسجلات سيرفر حقيقية لاحقًا */
export function audit(desc: string, entity: string, type = 'إجراء') {
  const u = useAuthStore.getState().user
  db.logs.unshift({
    id: `LOG-${++db.seq.log}`,
    type,
    actor: u?.name ?? 'النظام',
    role: u?.role ?? 'النظام',
    email: u?.email ?? 'system@daam.sa',
    desc,
    entity,
    time: nowStamp(),
    ip: '10.20.4.18',
  })
}