import { useState, useEffect } from 'react'
import { FileText, RefreshCw, AlertTriangle, Sparkles, TrendingUp, Building2, ExternalLink } from 'lucide-react'

interface ResearchReportCardProps {
  symbol: string
}

interface Report {
  title: string
  rating: string
  institution: string
  date: string
  industry: string
  pdf_url: string
  eps_forecast: {
    [year: string]: {
      eps: number
      pe: number | null
    }
  }
}

interface ResearchSummary {
  symbol: string
  name: string
  current_price: number
  report_count: number
  summary: string
  reports: Report[]
  sources: string
  error?: string
}

export function ResearchReportCard({ symbol }: ResearchReportCardProps) {
  const [data, setData] = useState<ResearchSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/stock/${symbol}/ai/research-summary?limit=5`)
      
      if (!response.ok) {
        throw new Error('获取研报分析失败')
      }
      
      const result: ResearchSummary = await response.json()
      if (result.error) {
        throw new Error(result.error)
      }
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
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

  const getRatingColor = (rating: string) => {
    if (rating.includes('买入') || rating.includes('强烈推荐')) return 'text-green-600 bg-green-50'
    if (rating.includes('增持') || rating.includes('推荐')) return 'text-blue-600 bg-blue-50'
    if (rating.includes('持有') || rating.includes('中性')) return 'text-yellow-600 bg-yellow-50'
    if (rating.includes('卖出') || rating.includes('减持')) return 'text-red-600 bg-red-50'
    return 'text-gray-600 bg-gray-50'
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <RefreshCw className="h-10 w-10 text-purple-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-700 font-medium">AI正在分析券商研报...</p>
            <p className="text-sm text-gray-400 mt-2">获取并总结最近研报信息</p>
            <p className="text-xs text-gray-400 mt-1">预计需要15-30秒</p>
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
            <p>研报分析失败: {error}</p>
          </div>
          <button 
            onClick={fetchData}
            className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            重新分析
          </button>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-gray-500 text-center py-12">
          <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p>暂无研报数据</p>
          <button 
            onClick={fetchData}
            className="mt-4 px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            获取研报
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
        <div className="flex items-center">
          <div className="bg-purple-100 p-2 rounded-lg mr-3">
            <FileText className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 flex items-center">
              券商研报分析
              <Sparkles className="h-4 w-4 text-yellow-500 ml-2" />
            </h3>
            <p className="text-sm text-gray-500">研报总结 · 盈利预测 · 投资建议</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {data.current_price > 0 && (
            <span className="text-sm bg-green-50 text-green-700 px-3 py-1 rounded-full flex items-center">
              <TrendingUp className="h-3 w-3 mr-1" />
              ¥{data.current_price.toFixed(2)}
            </span>
          )}
          {data.report_count > 0 && (
            <span className="text-sm bg-purple-50 text-purple-700 px-3 py-1 rounded-full">
              {data.report_count}篇研报
            </span>
          )}
          <span className="text-sm text-gray-500 font-medium">{data.name}</span>
          <button 
            onClick={fetchData}
            className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
            title="重新分析"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {data.reports && data.reports.length > 0 && (
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <Building2 className="h-4 w-4 mr-2" />
            最近研报列表
          </h4>
          <div className="space-y-2">
            {data.reports.map((report, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getRatingColor(report.rating)}`}>
                      {report.rating}
                    </span>
                    <span className="text-xs text-gray-500">{report.institution}</span>
                    <span className="text-xs text-gray-400">{report.date}</span>
                  </div>
                  <p className="text-sm text-gray-700 truncate">{report.title}</p>
                  {report.eps_forecast && Object.keys(report.eps_forecast).length > 0 && (
                    <div className="flex gap-3 mt-1">
                      {Object.entries(report.eps_forecast).slice(0, 3).map(([year, forecast]) => (
                        <span key={year} className="text-xs text-blue-600">
                          {year} EPS: {forecast.eps.toFixed(2)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {report.pdf_url && (
                  <a
                    href={report.pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-3 p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                    title="查看研报PDF"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="prose prose-sm max-w-none">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center">
          <Sparkles className="h-4 w-4 mr-2 text-yellow-500" />
          AI研报总结
        </h4>
        <div 
          className="text-sm leading-relaxed research-summary"
          dangerouslySetInnerHTML={{ 
            __html: renderMarkdown(data.summary) 
          }}
        />
      </div>

      <div className="mt-6 pt-4 border-t border-gray-100">
        <p className="text-xs text-gray-400 flex items-center">
          <span className="mr-1">📊</span>
          {data.sources}
          <span className="mx-2">·</span>
          <span>分析时间: {new Date().toLocaleString('zh-CN')}</span>
        </p>
      </div>
    </div>
  )
}
