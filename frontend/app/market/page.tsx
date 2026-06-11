import { MarketContent } from '@/src/components/market/MarketContent'

interface MarketPageProps {
  searchParams: { tab?: string }
}

export const metadata = {
  title: '市场行情 - 股票投资分析系统',
  description: '实时市场行情、热门股票、热门行业、财经资讯',
}

export default function MarketPage({ searchParams }: MarketPageProps) {
  const tab = searchParams.tab ?? 'stocks'
  return (
    <main className="container mx-auto px-4 py-6">
      <MarketContent activeTab={tab} />
    </main>
  )
}
