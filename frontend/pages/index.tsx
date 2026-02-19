import Head from 'next/head'
import dynamic from 'next/dynamic'
import { Navigation } from '@/components/Navigation'
import { SearchBar } from '@/components/SearchBar'
import { StockCard } from '@/components/StockCard'
import { FinancialDataCard } from '@/components/FinancialDataCard'
import { CardSkeleton } from '@/components/Loading'
import { useState, Suspense, lazy, useMemo } from 'react'

const StockChart = dynamic(
  () => import('@/components/StockChart').then(mod => mod.StockChart),
  { 
    loading: () => <CardSkeleton />,
    ssr: false 
  }
)

const TechnicalAnalysisChart = dynamic(
  () => import('@/components/TechnicalAnalysisChart').then(mod => mod.TechnicalAnalysisChart),
  { 
    loading: () => <CardSkeleton />,
    ssr: false 
  }
)

const ResearchReportCard = dynamic(
  () => import('@/components/ResearchReportCard').then(mod => mod.ResearchReportCard),
  { 
    loading: () => <CardSkeleton />,
    ssr: false 
  }
)

const InvestmentValueCard = dynamic(
  () => import('@/components/InvestmentValueCard').then(mod => mod.InvestmentValueCard),
  { 
    loading: () => <CardSkeleton />,
    ssr: false 
  }
)

export default function Home() {
  const [selectedStock, setSelectedStock] = useState<string | null>(null)

  const handleStockSelect = (symbol: string) => {
    setSelectedStock(symbol)
  }

  const stockComponents = useMemo(() => {
    if (!selectedStock) return null
    
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StockCard symbol={selectedStock} />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <FinancialDataCard symbol={selectedStock} />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <StockChart symbol={selectedStock} />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <TechnicalAnalysisChart symbol={selectedStock} />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <ResearchReportCard symbol={selectedStock} />
        </div>

        <div className="grid grid-cols-1 gap-6">
          <InvestmentValueCard symbol={selectedStock} />
        </div>
      </div>
    )
  }, [selectedStock])

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>股票投资分析系统</title>
        <meta name="description" content="专业的股票投资分析平台，提供实时行情、财务数据、技术分析和AI智能投资分析" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <Navigation />

      <main className="container mx-auto px-4 py-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            股票投资分析系统
          </h1>
          <p className="text-lg text-gray-600">
            实时行情 · 财务数据 · 技术分析 · AI智能投资分析
          </p>
        </div>

        <div className="max-w-md mx-auto mb-8">
          <SearchBar onStockSelect={handleStockSelect} />
        </div>

        {stockComponents}

        {!selectedStock && (
          <div className="col-span-full text-center py-12">
            <div className="space-y-4">
              <p className="text-gray-500">请搜索股票代码开始查询</p>
              <div className="text-sm text-gray-400">
                <p>支持的功能：</p>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full">实时价格</span>
                  <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full">财务数据</span>
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full">技术分析</span>
                  <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full">K线图表</span>
                  <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">券商研报</span>
                  <span className="bg-pink-100 text-pink-800 px-3 py-1 rounded-full">AI投资分析</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
