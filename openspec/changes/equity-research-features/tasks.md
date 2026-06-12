## 1. 基础准备

- [x] 1.1 创建 `backend/prompts/` 目录，添加 `sector.md`、`financials.md`、`valuation.md`、`thesis_analysis.md`、`synthesis.md`、`earnings_preview.md`、`morning_note.md` 七个 prompt 模板文件
- [x] 1.2 在 `backend/services/ai_service.py` 中实现 `PromptLoader`：应用启动时从 `prompts/` 目录加载所有模板到内存，模板文件缺失时抛出 `FileNotFoundError` 并中止启动
- [x] 1.3 在 `backend/infra/repositories/` 中新增 `watchlist_repo.py`：建表 `watchlist(symbol TEXT PRIMARY KEY, added_at TEXT)`，启动时自动建表
- [x] 1.4 在 `backend/infra/repositories/` 中新增 `thesis_repo.py`：建表 `thesis(id, symbol, thesis_statement, pillars JSON, risks JSON, conviction, stop_loss, version INTEGER, is_active BOOLEAN, created_at, updated_at)`，启动时自动建表
- [x] 1.5 在 `backend/infra/repositories/` 中新增 `catalyst_events_repo.py`：建表 `catalyst_events(id, thesis_id INTEGER REFERENCES thesis(id), symbol, date, event, impact, notes, created_at)`，启动时自动建表
- [x] 1.6 在 `backend/infra/repositories/` 中新增 `morning_note_repo.py`：建表 `morning_notes(id, date TEXT UNIQUE, status TEXT, content JSON, regenerated BOOLEAN, created_at, updated_at)`，启动时自动建表
- [x] 1.7 在 `backend/infra/repositories/` 中新增 `stock_fundamentals_repo.py`：建表 `stock_fundamentals`，主键为 `(symbol, year)` 复合主键（无自增 id），字段含 `symbol`、`name`、`industry`、`year`、`report_date`、`roe`、`revenue_growth`、`net_profit_growth`、`gross_margin`、`pe`、`pb`、`dividend_yield`、`pe_snapshot_date`、`debt_ratio`、`fcf_ratio`、`frozen BOOLEAN DEFAULT 0`；写入用 `INSERT OR REPLACE INTO`，启动时自动建表
- [x] 1.8 在 `backend/infra/repositories/` 中新增 `data_sync_status_repo.py`：建表 `data_sync_status(task TEXT PRIMARY KEY, status TEXT, progress INTEGER, total INTEGER, started_at, finished_at, error TEXT)`，启动时自动建表
- [x] 1.9 在 `backend/app.py` 中注册所有新表的建表初始化调用
- [x] 1.10 在 `backend/infra/repositories/stock_repo.py` 的 `_init_schema()` 开头添加 `conn.execute("PRAGMA journal_mode=WAL")`，所有新 repo 的 `_init_schema()` 同样添加，允许 Morning Note 后台异步写入与主线程请求并发操作 SQLite 而不产生文件锁

## 2. AI 分析模块化

- [x] 2.1 将 `ai_service.py` 的综合分析拆分为四个独立异步方法：`analyze_sector`、`analyze_financials`、`analyze_valuation`、`build_thesis_analysis`，各自使用对应 prompt 模板
- [x] 2.2 重构 `analyze_comprehensive`：使用 `asyncio.gather(..., return_exceptions=True)` 并发调用上述四个方法；失败的子分析用占位文本替换（不传入原始异常），每个成功结果截断至最多 800 字；发起第五次 LLM 综合叙事调用（使用 `synthesis.md` 模板）；全部失败时跳过第五次调用直接返回错误；响应中附 `partial_failure` 字段（成功时为空列表）；保持原有响应结构（`symbol`、`name`、`analysis`、`current_price`、`industry`、`sources`）不变
- [x] 2.3 在 `backend/api/routes/stock.py` 中新增四个独立分析端点：GET `/api/ai/analyze/sector/<symbol>`、`/financials/<symbol>`、`/valuation/<symbol>`、`/thesis/<symbol>`
- [ ] 2.4 编写单元测试：验证 `PromptLoader` 加载与插值逻辑；验证 `analyze_comprehensive` 确实发起 5 次 LLM 调用而非 4 次；验证响应结构与旧版一致

## 3. Watchlist 后端

- [x] 3.1 实现 `backend/services/watchlist_service.py`：`add(symbol)`（幂等）、`remove(symbol)`、`list()` 三个方法，list 结果中附 `has_thesis` 字段
- [x] 3.2 在 `backend/api/routes/watchlist.py` 中实现：
  - POST `/api/watchlist/<symbol>`（关注，幂等）
  - DELETE `/api/watchlist/<symbol>`（取消关注，不影响 Thesis）
  - GET `/api/watchlist`（列表，含 has_thesis）
- [x] 3.3 在 `backend/app.py` 中注册 watchlist blueprint
- [ ] 3.4 编写集成测试：关注/取消关注幂等性、has_thesis 字段正确性

## 4. Thesis Tracker 后端

- [x] 4.1 实现 `backend/services/thesis_service.py`：
  - `create(symbol, data)`：先调用 `watchlist_service.add(symbol)`（幂等）确保自动加入 Watchlist；旧版 `is_active=false`，新版 version+1 插入，自动复制旧版未过期催化剂到新版（通过 catalyst_events_repo）
  - `get(symbol)`：返回 `is_active=true` 的版本，404 if none
  - `list()`：所有活跃 Thesis 摘要
  - `update(symbol, data)`：更新 conviction / stop_loss
  - `update_pillar(symbol, pillar_uuid, status)`：JSON 中按 UUID 匹配更新，状态变 `invalidated` 时自动将 conviction 降至 `low`
  - `add_catalyst(symbol, data)`：插入 `catalyst_events`，关联当前活跃 Thesis id
  - `delete_catalyst(symbol, catalyst_id)`
- [x] 4.2 Pillar 创建时由后端生成 UUID，写入 pillars JSON 数组
- [x] 4.3 在 `backend/api/routes/thesis.py` 中实现所有端点（POST /thesis、GET /thesis、GET /thesis/<symbol>、PATCH /thesis/<symbol>、PATCH /thesis/<symbol>/pillars/<uuid>、POST /thesis/<symbol>/catalysts、DELETE /thesis/<symbol>/catalysts/<id>）
- [x] 4.4 在 `backend/app.py` 中注册 thesis blueprint
- [ ] 4.5 编写集成测试：软版本化逻辑、催化剂继承、pillar UUID 更新、invalidated 触发 conviction 降级

## 5. Earnings Preview 后端

- [x] 5.1 实现 `AIService.generate_earnings_preview(symbol, stock_info, quarter)`：优先调用 `ak.stock_analyst_forecast_em()` 获取分析师预测，失败时降级为 web search，使用 `earnings_preview.md` 模板生成分析
- [x] 5.2 响应结构：`{ consensus, key_metrics, scenarios(3个 bull/base/bear), catalysts, data_source("analyst_forecast"|"web_search") }`，scenarios 每项含 `stock_reaction` 量化区间
- [x] 5.3 在 `backend/api/routes/stock.py` 中新增 POST `/api/ai/earnings-preview`，接收 `symbol` 和 `quarter`，结果缓存 24h（相同 symbol+quarter 命中缓存）
- [ ] 5.4 编写集成测试：akshare 可用/不可用两种路径、响应结构完整性、data_source 字段正确标注

## 6. 选股筛选后端

- [x] 6.1 新增 `backend/scripts/refresh_fundamentals.py`：
  - 读取 `data_sync_status` 表判断是否需要续传（progress 断点）
  - 脚本启动时先调用 `ak.stock_info_a_code_name()` 拉取全量 name 映射，调用 `ak.stock_board_industry_name_em()` + 成分股接口拼出 industry 映射（复用 `akshare_provider.py` 中已有逻辑），与财务数据合并后写入 `name`、`industry` 字段
  - 遍历全量 A 股代码，调用 `akshare_provider.get_financial_data(symbol)` 公开方法获取多年财务指标（ROE、营收增速、毛利率、EPS、经营现金流等），每条记录含 `report_date`（实际披露日）
  - 每处理 50 只股票后 `time.sleep(2)` 避免触发东方财富限流，同时刷新 `data_sync_status.progress` 断点（总耗时约 3-4 小时，离线脚本可接受）
  - 一次性调用 `ak.stock_zh_a_spot_em()` 拉取全量 PE、PB、股息率快照，按 symbol 与财务数据合并写入 `stock_fundamentals` 表（含 `pe_snapshot_date`，周度快照最多 7 天延迟）
  - 历史年份（当前年 -2 及以前）写入后 `frozen=true`，后续运行跳过；写入用 `INSERT OR REPLACE INTO (symbol, year)` 幂等操作
  - 实时更新 `data_sync_status` 进度（progress、total、status）
- [x] 6.2 实现 `backend/services/screener_service.py`：
  - 定义三套预设（PRESETS）：value（PE<25、PB<1.5、股息率>3%）、growth（营收增速>15%、净利增速>20%、ROE>15%）、quality（毛利率>30%、FCF率>0.8、负债率<40%、近3年ROE均>15%）
  - `screen(preset, overrides)` 直接查 `stock_fundamentals` 表，质量套餐 ROE 连续性通过多年记录判断
  - 结果按套餐核心指标降序（成长→营收增速、价值→股息率、质量→最新ROE），最多 50 条
  - 数据未就绪（表空或 sync_status 非 done）返回 503
  - 阈值合法性校验
- [x] 6.3 在 `backend/api/routes/screener.py` 中实现：
  - POST `/api/screener/screen`
  - GET `/api/screener/sync-status`
- [x] 6.4 在 `backend/app.py` 中注册 screener blueprint
- [ ] 6.5 编写单元测试：三套预设过滤逻辑（含质量套餐多年ROE连续判断）、阈值覆盖、数据不足排除逻辑

## 7. 催化剂日历后端

- [x] 7.1 实现 `backend/services/calendar_service.py`：
  - `get_events(year, month)`：SQL 查询 `catalyst_events JOIN thesis(is_active=true)` 按月份范围筛选（manual），合并 akshare 财报日期（auto），akshare 失败时 `data_partial=true`
  - `get_upcoming(days)`：查 date 在 [today, today+N] 范围的事件，无结果返回空列表
  - 日历范围由 `watchlist` 表决定（不限于有 Thesis 的股票）
- [x] 7.2 在 `backend/api/routes/calendar.py` 中实现：
  - GET `/api/calendar/events?year=&month=`
  - GET `/api/calendar/upcoming?days=7`
- [x] 7.3 在 `backend/app.py` 中注册 calendar blueprint
- [ ] 7.4 编写集成测试：manual+auto 聚合、akshare 失败降级、无 Thesis 的 Watchlist 股票只返回 auto 事件

## 8. Morning Note 后端

- [x] 8.1 实现 `backend/services/morning_note_service.py`：
  - `get_or_trigger_today()`：检查今日记录，有 `success` 直接返回，有 `generating` 返回历史+状态，无记录则写入 `status='generating'` 占位，启动 `threading.Thread(target=_generate_blocking, daemon=True)` 后台线程，立即返回
  - `_generate_blocking()`：同步函数，内部用 `asyncio.run()` 调用 LLM 接口（新线程中使用 `asyncio.run()` 是合理的）；批量拉取所有 Watchlist 股票价格变动，调用 `calendar_service.get_upcoming(days=1)` 获取当日事件注入 prompt，一次 web search（多 symbol 拼合查询），单次 LLM 调用生成含固定 markdown 标题的简报；按 `## 价格速览`、`## 隔夜动态`、`## 今日待关注`、`## 操作倾向` 标题分割为 `sections`，分割失败时 `sections=null` 但 `raw_text` 保留；成功写入 `content={raw_text, sections}`，`status='success'`；失败写入 `status='failed'`
  - Watchlist 为空时直接写入 `status='failed'`，error="无关注股票"，不启动线程
- [x] 8.2 在 `backend/api/routes/morning_note.py` 中实现：
  - GET `/api/morning-note`（按需触发 + 返回最新 success 记录，附 today_status）
  - GET `/api/morning-note?date=YYYY-MM-DD`（指定日期，非 success 返回 404）
  - GET `/api/morning-note/history`（最近 30 天列表含状态，缺失日期标 missing）
  - POST `/api/morning-note/generate`（手动触发，当日已有 success 时覆盖并标 regenerated=true）
- [x] 8.3 在 `backend/app.py` 中注册 morning_note blueprint（不注册 APScheduler）
- [ ] 8.4 编写集成测试：三态状态机转换、Watchlist 为空时的处理、手动触发覆盖逻辑

## 9. 前端 - Watchlist 关注按钮

- [x] 9.1 在 `API_ROUTES`（`src/lib/api.ts`）中新增 watchlist 相关路径
- [x] 9.2 新增 `frontend/src/hooks/useWatchlist.ts`：封装关注/取消关注/查询列表的 `apiFetch` 调用
- [x] 9.3 在股票详情页顶部新增"关注 / 取消关注"按钮，读取 Watchlist 状态实时反映，点击后乐观更新 UI

## 10. 前端 - Thesis Tracker Tab

- [x] 10.1 新增 `frontend/src/types/thesis.ts`：定义 `Thesis`、`Pillar`（含 uuid）、`Catalyst`、`Conviction` 类型
- [x] 10.2 新增 `frontend/src/hooks/useThesis.ts`：封装 Thesis CRUD 的 `apiFetch` 调用
- [x] 10.3 新增 `frontend/src/components/stock/ThesisTracker.tsx`：空状态显示创建入口；有 Thesis 时以卡片展示支柱（绿/橙/红/灰颜色编码）、催化剂列表、信心评级；支持 pillar 状态内联编辑（点击弹出下拉）
- [x] 10.4 在股票详情页新增"投资逻辑"Tab，引入 `ThesisTracker` 组件

## 11. 前端 - Earnings Preview Tab

- [x] 11.1 新增 `frontend/src/types/earningsPreview.ts`：定义 `EarningsPreview`、`Scenario`、`KeyMetric` 类型
- [x] 11.2 新增 `frontend/src/hooks/useEarningsPreview.ts`：封装 POST `/api/ai/earnings-preview` 调用
- [x] 11.3 新增 `frontend/src/components/stock/EarningsPreview.tsx`：季度选择器 + 三情景对比表 + 关键指标卡片 + data_source 免责说明
- [x] 11.4 在股票详情页新增"财报前瞻"Tab，引入 `EarningsPreview` 组件

## 12. 前端 - 选股筛选页面

- [x] 12.1 新增 `frontend/src/types/screener.ts`：定义 `Preset`、`ScreenerResult`、`SyncStatus` 类型
- [x] 12.2 新增 `frontend/src/hooks/useScreener.ts`：封装 `/api/screener/screen` 和 `/api/screener/sync-status` 调用
- [x] 12.3 新增 `frontend/app/screen/page.tsx`：三套套餐卡片 + 阈值调整面板 + 结果表格（含数据截止日期）+ 零结果提示 + 数据未就绪提示
- [x] 12.4 在导航菜单中添加"选股"入口（链接到 `/screen`）

## 13. 前端 - 催化剂日历页面

- [x] 13.1 新增 `frontend/src/types/calendar.ts`：定义 `CatalystEvent`、`EventSource`、`EventImpact` 类型
- [x] 13.2 新增 `frontend/src/hooks/useCalendar.ts`：封装 `/api/calendar/events` 和 `/api/calendar/upcoming` 调用
- [x] 13.3 新增 `frontend/app/calendar/page.tsx`：月视图日历（影响等级颜色标记点）、点击日期展开事件详情（含 source 标识）、跨月导航、Watchlist 为空时引导提示
- [x] 13.4 在导航菜单中添加"日历"入口（链接到 `/calendar`）

## 14. 前端 - Morning Note 页面

- [x] 14.1 新增 `frontend/src/types/morningNote.ts`：定义 `MorningNote`、`NoteStatus`（generating/success/failed）类型
- [x] 14.2 新增 `frontend/src/hooks/useMorningNote.ts`：封装查询/触发接口，实现轮询逻辑（收到 generating 时每 5 秒轮询，收到 success/failed 时停止）
- [x] 14.3 新增 `frontend/app/morning-note/page.tsx`：四个分组卡片（价格速览/隔夜动态/今日事件/操作倾向）；生成中时展示昨日简报 + 提示条；failed 时显示错误 + 重试按钮；历史简报导航（最近 30 天）
- [x] 14.4 在导航菜单中添加"早报"入口（链接到 `/morning-note`）

## 15. 测试与收尾

- [x] 15.1 运行 `npm run test:backend` 确保所有后端新增测试通过
- [x] 15.2 运行 `npm run test:frontend` 确保前端现有 56 个测试无回归
- [x] 15.3 运行 `npm run type-check` 确保前端 TypeScript 无类型错误
- [x] 15.4 运行 `npm run lint` 确保前后端 lint 通过
- [ ] 15.5 手动执行 `python backend/scripts/refresh_fundamentals.py` 完成首次基本面数据初始化，验证 `/screen` 页面可正常筛选
- [ ] 15.6 手动验证：Watchlist 关注/取消关注 → Morning Note 生成 → 三态轮询 → 成功展示
- [ ] 15.7 手动验证：创建 Thesis → 更新 pillar 状态 → invalidated 触发 conviction 降级 → 催化剂日历显示事件
