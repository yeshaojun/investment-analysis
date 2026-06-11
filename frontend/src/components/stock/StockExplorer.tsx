'use client'

import dynamic from 'next/dynamic'
import { Activity, BarChart3, FileText, LineChart, Sparkles, WalletCards } from 'lucide-react'
import { CardSkeleton } from '@/src/components/base/Loading'
import { SearchBar } from '@/src/components/search/SearchBar'
import { StockCard } from '@/src/components/stock/StockCard'
import { FinancialDataCard } from '@/src/components/stock/FinancialDataCard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs'
import { useStockStore } from '@/src/stores/stockStore'

const StockChart = dynamic(
  () => import('@/src/components/stock/StockChart').then(m => m.StockChart),
  { loading: () => <CardSkeleton />, ssr: false }
)
const TechnicalAnalysisChart = dynamic(
  () => import('@/src/components/stock/TechnicalAnalysisChart').then(m => m.TechnicalAnalysisChart),
  { loading: () => <CardSkeleton />, ssr: false }
)
const ResearchReportCard = dynamic(
  () => import('@/src/components/stock/ResearchReportCard').then(m => m.ResearchReportCard),
  { loading: () => <CardSkeleton />, ssr: false }
)
const InvestmentValueCard = dynamic(
  () => import('@/src/components/stock/InvestmentValueCard').then(m => m.InvestmentValueCard),
  { loading: () => <CardSkeleton />, ssr: false }
)

export function StockExplorer() {
  const selectedStock = useStockStore((s) => s.selectedSymbol)
  const setSelectedStock = useStockStore((s) => s.setSelectedSymbol)

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm md:p-5">
        <div className="mx-auto max-w-2xl">
          <SearchBar onStockSelect={setSelectedStock} />
        </div>
      </div>

      {selectedStock ? (
        <Tabs defaultValue="overview" className="space-y-4">
          <div className="sticky top-14 z-40 -mx-4 border-y border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm backdrop-blur-xl md:static md:mx-0 md:rounded-xl md:border">
            <TabsList className="grid h-auto w-full grid-cols-5 gap-1 overflow-x-auto rounded-lg bg-slate-100 p-1">
              <TabsTrigger value="overview" className="gap-1.5 px-2 py-2 text-xs md:text-sm">
                <WalletCards className="h-3.5 w-3.5" aria-hidden="true" />
                总览
              </TabsTrigger>
              <TabsTrigger value="chart" className="gap-1.5 px-2 py-2 text-xs md:text-sm">
                <LineChart className="h-3.5 w-3.5" aria-hidden="true" />
                走势
              </TabsTrigger>
              <TabsTrigger value="technical" className="gap-1.5 px-2 py-2 text-xs md:text-sm">
                <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                技术
              </TabsTrigger>
              <TabsTrigger value="research" className="gap-1.5 px-2 py-2 text-xs md:text-sm">
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                研报
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-1.5 px-2 py-2 text-xs md:text-sm">
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                AI
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="mt-0 space-y-5">
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
              <StockCard symbol={selectedStock} />
              <FinancialDataCard symbol={selectedStock} />
            </div>
          </TabsContent>

          <TabsContent value="chart" className="mt-0">
            <StockChart symbol={selectedStock} />
          </TabsContent>

          <TabsContent value="technical" className="mt-0">
            <TechnicalAnalysisChart symbol={selectedStock} />
          </TabsContent>

          <TabsContent value="research" className="mt-0">
            <ResearchReportCard symbol={selectedStock} />
          </TabsContent>

          <TabsContent value="ai" className="mt-0">
            <InvestmentValueCard symbol={selectedStock} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-5 py-12 text-center shadow-sm">
          <div className="mx-auto max-w-xl space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-950 text-white shadow-sm">
              <BarChart3 className="h-6 w-6" aria-hidden="true" />
            </div>
            <div>
              <p className="font-medium text-slate-950">搜索股票代码或公司名称开始分析</p>
              <p className="mt-1 text-sm text-slate-500">选择个股后，可在上方 tab 中切换财务、走势、技术、研报和 AI 分析。</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 text-xs">
              {['行情概览', '财务数据', 'K线走势', '技术指标', '券商研报', 'AI分析'].map((label) => (
                <span key={label} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 shadow-sm">
                  {label}
                </span>
              ))}
              </div>
          </div>
        </div>
      )}
    </div>
  )
}
