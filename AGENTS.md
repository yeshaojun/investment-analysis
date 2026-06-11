# Repository Guidelines

项目级业务原则、架构红线、编码规范以 [后端技术规范.md](/后端技术规范.md)、[前端技术规范.md](/前端技术规范.md)、[前端主题规范.md](/前端主题规范.md) 为准；本文件定义 AI 代理在仓库内工作时的通用协作规则与治理边界。

## Project Structure

```
investment-analysis/
├── frontend/                   # Next.js 14 App Router + TypeScript
│   ├── app/                    # App Router: layout.tsx, page.tsx, market/, rankings/, api/[...slug]/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # shadcn/ui primitives: button, card, badge, tabs, input, skeleton
│   │   │   ├── base/           # Navigation, Loading skeletons
│   │   │   ├── stock/          # StockCard, StockChart, FinancialDataCard, etc.
│   │   │   ├── market/         # MarketContent, RankingsCard
│   │   │   └── search/         # SearchBar
│   │   ├── hooks/              # useDataFetch (base), useStock, useMarket, useSearch, useRankings
│   │   ├── lib/                # api.ts (apiFetch + API_ROUTES), format.ts, stockUtils.ts, utils.ts (cn)
│   │   ├── stores/             # Zustand: stockStore.ts
│   │   └── types/              # stock.ts, market.ts
│   ├── __tests__/              # Jest + RTL: lib/, stock/ component tests
│   └── styles/                 # globals.css (Tailwind + CSS variables)
├── backend/                    # Flask API server
│   ├── app.py                  # Entry point, registers blueprints
│   ├── config.py               # All settings from env vars
│   ├── domain/stock.py         # Pure domain logic (market detection, constants)
│   ├── infra/
│   │   ├── cache.py            # Thread-safe in-process cache
│   │   ├── technical_indicators.py  # Technical indicator calculations
│   │   ├── providers/          # akshare_provider, yfinance_provider, ai_provider
│   │   └── repositories/       # stock_repo.py (all SQLite SQL)
│   ├── services/               # stock_service, ai_service, market_service
│   ├── api/
│   │   ├── response.py         # Unified HTTP response helpers
│   │   ├── routes/             # stock.py, market.py (Flask Blueprints)
│   │   └── schemas/            # stock.py (Pydantic response models)
│   └── tests/
│       ├── unit/               # domain, infra/cache, services
│       └── integration/        # Flask test client: stock, market, AI routes
├── docs/api/README.md          # API reference
└── data/                       # SQLite database + logs (gitignored)
```

Backend serves on `localhost:5000`; frontend on `localhost:3000`.

## Build, Test & Development Commands

Run all commands from the repo root unless noted.

| Command | Description |
|---|---|
| `npm run install:all` | Install root, frontend (npm), and backend (pip) dependencies |
| `npm run dev` | Start frontend + backend concurrently |
| `npm run dev:frontend` | Frontend only (`next dev`) |
| `npm run dev:backend` | Backend only (`python app.py`) |
| `npm run build` | Production build of the Next.js frontend |
| `npm run lint` | Lint both frontend (ESLint) and backend (flake8) |
| `npm run test` | Run all tests — frontend Jest (56 tests) + backend pytest (44 tests) |
| `npm run test:backend` | `python -m pytest` inside `backend/` |
| `npm run test:frontend` | `jest` inside `frontend/` |
| `npm run type-check` | `tsc --noEmit` inside `frontend/` |

## 编码原则

1. **编码前思考**

   不要假设。不要隐藏困惑。呈现权衡。
   - 明确说明假设 — 如果不确定，询问而不是猜测
   - 呈现多种解释 — 当存在歧义时，不要默默选择
   - 适时提出异议 — 如果存在更简单的方法，说出来
   - 困惑时停下来 — 指出不清楚的地方并要求澄清

2. **分层原则**

   - 前端：路由 → 业务组件 → base/ui 组件；hook 按域分文件；lib/ 放纯函数
   - 后端：路由 → service → provider/repo；禁止跨层直访；SQL 只在 repo 层

3. **禁止事项**

   - 前端禁止散落 fetch 调用，统一走 apiFetch + API_ROUTES
   - 后端禁止在路由层写业务逻辑，禁止在 service 层写 SQL
   - 禁止 asyncio.run()（AI 路由已迁为 Flask async 原生）
   - 禁止把 mock 数据混入生产服务
