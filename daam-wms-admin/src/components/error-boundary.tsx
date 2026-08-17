import { Component, type ReactNode } from 'react'
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error, info: unknown) { console.error('ErrorBoundary caught:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 text-center shadow-lg">
            <p className="text-lg font-black text-destructive">An unexpected error occurred</p>
            <p className="mt-2 break-words text-xs font-semibold text-muted-foreground">{this.state.error.message}</p>
            <button onClick={() => window.location.reload()} className="mt-4 rounded-lg bg-foreground px-4 py-2 text-sm font-extrabold text-background">Reload app</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
