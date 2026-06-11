# 股票查询 API 文档

## 基础信息

- **Base URL**: `http://localhost:5000/api`
- **数据格式**: JSON / UTF-8
- **前端代理**: Next.js App Router `app/api/[...slug]/route.ts` 透明转发，前端直接访问 `/api/...`

## 通用响应格式

### 成功
```json
{
  "success": true,
  "data": {},
  "message": "操作成功"
}
```

### 失败
```json
{
  "success": false,
  "error": "错误描述",
  "code": "ERROR_CODE"
}
```

### 错误码表

| HTTP 状态 | code | 含义 |
|-----------|------|------|
| 400 | BAD_REQUEST | 参数错误 |
| 404 | NOT_FOUND | 资源不存在 |
| 500 | INTERNAL_ERROR | 服务器内部错误 |

---

## 接口列表

### 健康检查

```
GET /health
```

**响应 data**
```json
{ "status": "ok" }
```

---

### 股票基本信息

```
GET /stock/<symbol>
```

**路径参数**
- `symbol`: 股票代码，A股6位数字、港股5位数字、美股英文代码

**响应 data**
```json
{
  "symbol": "AAPL",
  "name": "Apple Inc.",
  "price": 170.23,
  "change": 2.34,
  "changePercent": 1.39,
  "volume": 45234500,
  "marketCap": 2675000000000,
  "sector": "Technology",
  "industry": "Consumer Electronics",
  "lastUpdated": "2024-02-13T10:30:00.000000"
}
```

---

### 股票历史行情

```
GET /stock/<symbol>/history
```

**查询参数**

| 参数 | 默认值 | 可选值 | 说明 |
|------|--------|--------|------|
| period | 1mo | 1d / 5d / 1mo / 3mo / 6mo / 1y / 2y / 5y / max | 时间范围 |
| interval | 1d | 1m / 5m / 15m / 30m / 1h / 1d / 1wk / 1mo | 数据间隔 |
| indicators | true | true / false | 是否附带技术指标 |

**响应 data**
```json
{
  "symbol": "AAPL",
  "period": "1mo",
  "interval": "1d",
  "data": [
    {
      "date": "2024-02-13T00:00:00.000Z",
      "open": 168.50,
      "high": 171.20,
      "low": 167.80,
      "close": 170.23,
      "volume": 45234500
    }
  ]
}
```

---

### 财务数据

```
GET /stock/<symbol>/financials
```

**响应 data**
```json
{
  "symbol": "600519",
  "financials": [
    {
      "year": 2023,
      "quarter": 4,
      "revenue": 1273916000000,
      "net_profit": 674705000000,
      "gross_margin": 91.97,
      "net_margin": 52.96,
      "operating_cash_flow": 720000000000,
      "eps": 53.73,
      "roe": 34.2,
      "revenue_yoy": 18.04,
      "profit_yoy": 19.16
    }
  ]
}
```

---

### 公司分析

```
GET  /stock/<symbol>/analysis     # 获取
POST /stock/<symbol>/analysis     # 保存
```

**POST body**
```json
{
  "company_profile": "...",
  "business_model": "...",
  "competitive_advantage": "...",
  "management_team": "...",
  "development_history": "..."
}
```

---

### 投资研报（手动录入）

```
GET  /stock/<symbol>/research     # 获取
POST /stock/<symbol>/research     # 保存
```

**POST body**
```json
{
  "broker": "中信证券",
  "rating": "买入",
  "target_price": 200.0,
  "report_summary": "...",
  "key_points": "...",
  "report_date": "2024-02-01"
}
```

---

### 研报（东方财富数据源）

```
GET /stock/<symbol>/research-reports?limit=5
```

**响应 data**
```json
{
  "symbol": "300750",
  "reports": [
    {
      "title": "宁德时代：储能业务加速，维持买入",
      "rating": "买入",
      "institution": "中金公司",
      "date": "2024-02-10",
      "industry": "电气设备",
      "pdf_url": "https://...",
      "eps_forecast": {
        "2025": { "eps": 12.50, "pe": 14.8 },
        "2026": { "eps": 15.20, "pe": 12.2 }
      }
    }
  ]
}
```

---

### 行业信息

```
GET  /industry/<industry_name>    # 获取
POST /industry                    # 保存
```

**POST body**
```json
{
  "industry_name": "新能源汽车",
  "industry_code": "NEV",
  "market_size": 8000000000000,
  "growth_rate": 35.2,
  "policy_support": "双碳目标，补贴延续",
  "future_prospect": "...",
  "description": "..."
}
```

---

### 搜索

```
GET /search?q=<keyword>
```

**参数**
- `q`: 搜索关键词，最少 2 个字符（股票代码或公司名称）

**响应 data**
```json
{
  "results": [
    { "symbol": "AAPL", "name": "Apple Inc." }
  ]
}
```

---

### 热门股票

```
GET /popular?limit=10
```

**响应 data**
```json
{
  "stocks": [
    { "symbol": "600519", "name": "贵州茅台", "price": 1685, "changePercent": 1.2 }
  ]
}
```

---

### 排行榜

```
GET /rankings/stocks?period=year&limit=50
GET /rankings/industries?period=year
```

**查询参数**
- `period`: day / week / month / year（默认 year）
- `limit`: 返回条数（仅 stocks，默认 50）

**响应 data（stocks）**
```json
{
  "period": "year",
  "rankings": [
    {
      "symbol": "NVDA",
      "name": "NVIDIA Corporation",
      "price": 450,
      "change_percent": 85.6,
      "volume": 50000000,
      "market_cap": 1100000000000
    }
  ]
}
```

---

### 市场行情

```
GET /market/news?limit=20           # 财经新闻（央视新闻源）
GET /market/hot-stocks?limit=20     # 热门股票实时涨跌
GET /market/hot-industries?limit=20 # 热门行业板块
```

**hot-industries 响应 data 示例**
```json
{
  "industries": [
    {
      "name": "半导体",
      "changePercent": 3.25,
      "change": 1.12,
      "leadingStock": "中芯国际",
      "leadingPercent": 7.8,
      "totalMarket": 2500000000000,
      "avgTurnover": 2.35,
      "upCount": 45,
      "downCount": 12
    }
  ]
}
```

---

### AI 分析

> AI 接口调用大模型，响应时间较长（最长 120 秒），建议前端加 loading 状态。

```
GET /stock/<symbol>/ai/investment-value    # 综合投资分析
GET /stock/<symbol>/ai/research-summary?limit=5   # 研报 AI 总结
```

**investment-value 响应 data**
```json
{
  "symbol": "300750",
  "name": "宁德时代",
  "current_price": 185.0,
  "industry": "电气设备",
  "analysis": "## 一、行业分析\n...",
  "sources": "基于网络搜索、财务数据和研报分析"
}
```

**research-summary 响应 data**
```json
{
  "symbol": "300750",
  "name": "宁德时代",
  "current_price": 185.0,
  "report_count": 5,
  "summary": "## 一、研报核心观点汇总\n...",
  "reports": [],
  "sources": "基于5篇券商研报分析"
}
```

---

### 缓存管理

```
POST /cache/clear
```

清除服务端所有内存缓存。**响应 data** 为 null，message 为 "缓存已清除"。

---

## 前端工具层对应关系

| API 接口 | `API_ROUTES` 函数 | `useDataFetch` Hook |
|----------|-----------------|---------------------|
| GET /stock/:symbol | `stockInfo(symbol)` | `useStockInfo` (src/hooks/useStock.ts) |
| GET /stock/:symbol/history | `stockHistory(...)` | `useStockHistory` |
| GET /stock/:symbol/financials | `stockFinancials(symbol)` | `useFinancialData` |
| GET /stock/:symbol/analysis | `stockAnalysis(symbol)` | `useCompanyAnalysis` |
| GET /stock/:symbol/research-reports | `stockResearchReports(...)` | `useResearchReports` |
| GET /stock/:symbol/ai/investment-value | `aiInvestmentValue(symbol)` | `useAiInvestmentValue` |
| GET /stock/:symbol/ai/research-summary | `aiResearchSummary(...)` | `useAiResearchSummary` |
| GET /search | `search(query)` | `useSearchStocks` (src/hooks/useSearch.ts) |
| GET /popular | `popular(limit)` | `usePopularStocks` (src/hooks/useMarket.ts) |
| GET /rankings/stocks | `rankingsStocks(...)` | `useStockRankings` (src/hooks/useRankings.ts) |
| GET /rankings/industries | `rankingsIndustries(period)` | `useIndustryRankings` |
| GET /market/news | `marketNews(limit)` | `useMarketNews` (src/hooks/useMarket.ts) |
| GET /market/hot-stocks | `marketHotStocks(limit)` | `useHotStocks` |
| GET /market/hot-industries | `marketHotIndustries(limit)` | `useHotIndustries` |
