import { RankingsCard } from '@/src/components/market/RankingsCard'
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react'

export const metadata = {
  title: '排行榜 - 股票投资分析系统',
  description: '行业和股票涨跌幅排行榜',
}

export default function RankingsPage() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center mb-4">
          <BarChart3 className="h-8 w-8 text-blue-600 mr-2" />
          <h1 className="text-4xl font-bold text-gray-900">市场排行榜</h1>
        </div>
        <p className="text-lg text-gray-600 flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
          实时追踪市场热点和资金流向
          <TrendingDown className="h-5 w-5 text-red-600 ml-2" />
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RankingsCard type="stocks" />
        <RankingsCard type="sectors" />
      </div>

      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">排行榜说明</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">排名规则</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• 按涨跌幅从高到低排序</li>
              <li>• 正值表示上涨，负值表示下跌</li>
              <li>• 前三名以特殊标识突出显示</li>
              <li>• 支持本月和今年两个时间维度</li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">使用建议</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• 关注涨幅较大的行业和个股</li>
              <li>• 结合成交量分析资金流向</li>
              <li>• 注意短期热点可能的风险</li>
              <li>• 建议结合基本面综合分析</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  )
}
