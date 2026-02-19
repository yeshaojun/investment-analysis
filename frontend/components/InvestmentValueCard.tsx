import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, RefreshCw, Sparkles, DollarSign, Building2 } from 'lucide-react'

interface InvestmentValueCardProps {
  symbol: string
}

interface AIAnalysis {
  symbol: string
  name: string
  current_price: number
  industry: string
  analysis: string
  sources: string
  error?: string
}

export function InvestmentValueCard({ symbol }: InvestmentValueCardProps) {
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalysis = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/stock/${symbol}/ai/investment-value`)
      
      if (!response.ok) {
        throw new Error('获取投资分析失败')
      }
      
      const data: AIAnalysis = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }
      setAnalysis(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalysis()
  }, [symbol])

  const renderMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^###### (.*$)/gm, '<h6 class="text-xs font-medium text-gray-600 mt-2 mb-1">$1</h6>')
      .replace(/^##### (.*$)/gm, '<h5 class="text-sm font-medium text-gray-700 mt-3 mb-2">$1</h5>')
      .replace(/^#### (.*$)/gm, '<h4 class="text-base font-semibold text-gray-800 mt-4 mb-2">$1</h4>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-gray-900 mt-6 mb-3 pb-2 border-b border-gray-200">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-blue-900 mt-6 mb-4">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-blue-900 mt-6 mb-4">$1</h1>')
      .replace(/^\* (.*$)/gm, '<li class="ml-4 text-gray-700 leading-relaxed">$1</li>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 text-gray-700 leading-relaxed">$1</li>')
      .replace(/^(\d+)\. (.*$)/gm, '<li class="ml-4 text-gray-700 leading-relaxed"><span class="font-medium text-blue-700">$1.</span> $2</li>')
      .replace(/\n\n/g, '</p><p class="my-2 text-gray-700 leading-relaxed">')
      .replace(/\n/g, '<br/>')
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <RefreshCw className="h-10 w-10 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium">AI正在进行综合投资分析...</p>
            <p className="text-sm text-gray-400 mt-2">包含行业分析、竞争力分析、估值分析等</p>
            <p className="text-xs text-gray-400 mt-1">预计需要30-60秒</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-red-500">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p>分析失败: {error}</p>
          </div>
          <button 
            onClick={fetchAnalysis}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            重新分析
          </button>
        </div>
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-gray-500 text-center py-12">
          <TrendingUp className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>暂无投资分析数据</p>
          <button 
            onClick={fetchAnalysis}
            className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            开始分析
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center">
          <div className="bg-blue-100 p-2 rounded-lg mr-3">
            <TrendingUp className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              综合投资分析
              <Sparkles className="h-4 w-4 text-yellow-500 ml-2" />
            </h3>
            <p className="text-sm text-gray-500">行业分析 · 竞争力 · 估值 · 投资建议</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {analysis.current_price > 0 && (
            <span className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full flex items-center">
              <DollarSign className="h-3 w-3 mr-1" />
              ¥{analysis.current_price.toFixed(2)}
            </span>
          )}
          {analysis.industry && (
            <span className="text-sm bg-purple-50 text-purple-700 px-3 py-1 rounded-full flex items-center">
              <Building2 className="h-3 w-3 mr-1" />
              {analysis.industry}
            </span>
          )}
          <span className="text-sm text-gray-500 font-medium">{analysis.name}</span>
          <button 
            onClick={fetchAnalysis}
            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
            title="重新分析"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="prose prose-sm max-w-none">
        <div 
          className="text-sm leading-relaxed investment-analysis"
          dangerouslySetInnerHTML={{ 
            __html: renderMarkdown(analysis.analysis) 
          }}
        />
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 flex items-center">
          <span className="mr-1">📊</span>
          {analysis.sources}
          <span className="mx-2">·</span>
          <span>分析时间: {new Date().toLocaleString('zh-CN')}</span>
        </p>
      </div>
    </div>
  )
}
