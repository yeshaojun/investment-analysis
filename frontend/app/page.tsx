import { StockExplorer } from '@/src/components/stock/StockExplorer'

export default function HomePage() {
  return (
    <main className="min-h-[calc(100vh-3.5rem)] bg-[radial-gradient(circle_at_top_left,rgba(15,23,42,0.08),transparent_32rem),linear-gradient(180deg,#f8fafc_0%,#ffffff_28rem)]">
      <div className="container mx-auto px-4 py-6 md:py-8">
        <div className="mb-6 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Equity Research Desk
            </p>
            <h1 className="font-display text-3xl font-bold tracking-normal text-slate-950 md:text-4xl">
              股票投资分析工作台
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              聚合个股行情、财务表现、技术走势、券商研报和 AI 综合分析。
            </p>
          </div>
          <div className="hidden rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-right shadow-sm md:block">
            <p className="text-xs text-slate-500">当前视图</p>
            <p className="text-sm font-semibold text-slate-950">个股深度分析</p>
          </div>
        </div>
        <StockExplorer />
      </div>
    </main>
  )
}
