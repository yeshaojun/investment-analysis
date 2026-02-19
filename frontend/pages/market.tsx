import Head from 'next/head'
import { useRouter } from 'next/router'
import { Navigation } from '@/components/Navigation'
import { MarketContent } from '@/components/MarketContent'

export default function MarketPage() {
  const router = useRouter()
  const tab = (router.query.tab as string) || 'stocks'

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>市场行情 - 股票投资分析系统</title>
        <meta name="description" content="实时市场行情、热门股票、热门行业、财经资讯" />
      </Head>

      <Navigation />
      
      <main className="container mx-auto px-4 py-6">
        <MarketContent activeTab={tab} />
      </main>
    </div>
  )
}
