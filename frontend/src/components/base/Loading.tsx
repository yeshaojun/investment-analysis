import { Skeleton } from '@/src/components/ui/skeleton'

export function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = { sm: 'h-4 w-4', md: 'h-6 w-6', lg: 'h-8 w-8' }[size]
  return (
    <svg
      className={`animate-spin ${sizeClass} text-primary`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

export function LoadingSpinner({ message = '加载中...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12" role="status" aria-label={message}>
      <Spinner size="lg" />
      <p className="mt-3 text-muted-foreground text-sm">{message}</p>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-3">
      <Skeleton className="h-5 w-1/3" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  )
}

export function StockCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-16" />
      </div>
      <Skeleton className="h-9 w-32" />
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

export function FinancialCardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-6 space-y-4">
      <Skeleton className="h-6 w-1/4" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-3/4" />
          </div>
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-48 w-full" />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

export function ChartSkeleton() {
  return <Skeleton className="h-64 w-full rounded-lg" />
}
