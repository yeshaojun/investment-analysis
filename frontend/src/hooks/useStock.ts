/**
 * Stock-domain hooks.
 * All stock info, history, financials, research, AI analysis.
 */

import { useDataFetch } from '@/src/hooks/useDataFetch'
import { apiFetch, API_ROUTES } from '@/src/lib/api'
import type {
  StockInfo,
  StockHistory,
  FinancialItem,
  ResearchReport,
  AIAnalysisResult,
  ResearchSummaryResult,
} from '@/src/types/stock'

export function useStockInfo(symbol: string | null) {
  return useDataFetch<StockInfo | null>(
    () => {
      if (!symbol) return Promise.resolve(null)
      return apiFetch<StockInfo>(API_ROUTES.stockInfo(symbol))
    },
    [symbol],
    {
      cacheKey: symbol ? `stock-info:${symbol}` : undefined,
      cacheTTL: 5 * 60 * 1000,
    }
  )
}

export function useStockHistory(
  symbol: string | null,
  period = '1mo',
  interval = '1d'
) {
  return useDataFetch<StockHistory | null>(
    () => {
      if (!symbol) return Promise.resolve(null)
      return apiFetch<StockHistory>(API_ROUTES.stockHistory(symbol, period, interval))
    },
    [symbol, period, interval],
    {
      cacheKey: symbol ? `stock-history:${symbol}:${period}:${interval}` : undefined,
      cacheTTL: 5 * 60 * 1000,
    }
  )
}

export function useFinancialData(symbol: string | null) {
  return useDataFetch<{ symbol: string; financials: FinancialItem[] } | null>(
    () => {
      if (!symbol) return Promise.resolve(null)
      return apiFetch(API_ROUTES.stockFinancials(symbol))
    },
    [symbol],
    {
      cacheKey: symbol ? `financial-data:${symbol}` : undefined,
      cacheTTL: 10 * 60 * 1000,
    }
  )
}

export function useCompanyAnalysis(symbol: string | null) {
  return useDataFetch<unknown>(
    () => {
      if (!symbol) return Promise.resolve(null)
      return apiFetch(API_ROUTES.stockAnalysis(symbol))
    },
    [symbol],
    {
      cacheKey: symbol ? `company-analysis:${symbol}` : undefined,
      cacheTTL: 30 * 60 * 1000,
    }
  )
}

export function useResearchReports(symbol: string | null, limit = 5) {
  return useDataFetch<{ symbol: string; reports: ResearchReport[] } | null>(
    () => {
      if (!symbol) return Promise.resolve(null)
      return apiFetch(API_ROUTES.stockResearchReports(symbol, limit))
    },
    [symbol, limit],
    {
      cacheKey: symbol ? `research-reports:${symbol}:${limit}` : undefined,
      cacheTTL: 15 * 60 * 1000,
    }
  )
}

export function useAiInvestmentValue(symbol: string | null) {
  return useDataFetch<AIAnalysisResult | null>(
    () => {
      if (!symbol) return Promise.resolve(null)
      return apiFetch<AIAnalysisResult>(API_ROUTES.aiInvestmentValue(symbol), {
        timeoutMs: 120_000,
      })
    },
    [symbol],
    {
      cacheKey: symbol ? `ai-investment-value:${symbol}` : undefined,
      cacheTTL: 60 * 60 * 1000,
    }
  )
}

export function useAiResearchSummary(symbol: string | null, limit = 5) {
  return useDataFetch<ResearchSummaryResult | null>(
    () => {
      if (!symbol) return Promise.resolve(null)
      return apiFetch<ResearchSummaryResult>(
        API_ROUTES.aiResearchSummary(symbol, limit),
        { timeoutMs: 120_000 }
      )
    },
    [symbol, limit],
    {
      cacheKey: symbol ? `ai-research-summary:${symbol}:${limit}` : undefined,
      cacheTTL: 60 * 60 * 1000,
    }
  )
}
