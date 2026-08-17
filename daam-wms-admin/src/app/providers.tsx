import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from '@/components/ui/sonner'
import { useState, type ReactNode } from 'react'
import { usePrefsStore } from '@/store/prefs-store'

export function Providers({ children }: { children: ReactNode }) {
  const lang = usePrefsStore(s => s.lang)
  const [client] = useState(
    () => new QueryClient({
      defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false } },
    }),
  )
  return (
    <QueryClientProvider client={client}>
      {children}
      <Toaster dir={lang === 'ar' ? 'rtl' : 'ltr'} richColors position={lang === 'ar' ? 'bottom-left' : 'bottom-right'} />
    </QueryClientProvider>
  )
}
