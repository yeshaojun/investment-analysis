## Context

当前 `backend/services/ai_service.py` 有两个方法：`analyze_comprehensive`（一个整合所有分析维度的巨型 prompt）和 `summarize_research_reports`。Prompt 文本硬编码在 Python 里，修改需要改代码。

除了 AI 分析，平台目前没有：结构化投资逻辑管理、财报前瞻、选股筛选、事件日历、每日简报。这些能力在 anthropics/financial-services 的 equity-research skill 体系中均有成熟的工作流模板可参考。

## Goals / Non-Goals

**Goals:**
- 将 AI 分析拆成 4 个独立方法，prompt 外置为 markdown 模板文件
- 新增 Watchlist：轻量级股票关注列表，驱动 Morning Note 和催化剂日历
- 新增 Thesis Tracker：可选附加在 Watchlist 股票上的结构化投资逻辑
- 新增 Earnings Preview：财报前瞻的三情景分析
- 新增 Stock Screener：基于预计算 `stock_fundamentals` 表的量化筛选
- 新增 Catalyst Calendar：关注股票事件聚合视图
- 新增 Morning Note：按需生成的每日简报，固定 2 次 LLM 调用

**Non-Goals:**
- 不引入 LLM 主动工具调用架构（function calling / agent 模式）
- 不集成付费数据源（FactSet、Morningstar 等）
- 不实现用户账号体系
- 不在 Flask 进程内运行定时任务

## Decisions

### 1. Prompt 外置方案：Markdown 模板文件 + 变量插值

将 prompt 模板存为 `backend/prompts/<name>.md`，用 `str.format_map()` 注入动态变量。服务启动时一次性加载所有模板到内存，模板文件缺失时启动失败并抛出 `FileNotFoundError`。

**选择原因**：非技术人员可直接编辑 prompt；git diff 清晰；与 anthropics/financial-services 的 skill 文件设计一致。

**放弃方案**：Jinja2 模板（引入额外依赖，当前复杂度不需要）

### 2. AI 分析模块化：4 个并发方法 + 第 5 次综合叙事调用

`AIService` 拆成 `analyze_sector`、`analyze_financials`、`analyze_valuation`、`build_thesis_analysis` 四个方法，使用 `asyncio.gather` 并发执行（四者无数据依赖，并发不影响正确性）。

`analyze_comprehensive` 作为第 5 次 LLM 调用：把 4 个独立分析作为 context，生成连贯的综合叙事，而非简单字符串拼接。保持原有 API 签名和响应结构不变。

**选择原因**：并发执行总耗时接近单次调用；第 5 次综合叙事避免 4 个独立模块内容矛盾或重复。

### 3. Thesis Tracker：软版本化 + pillars UUID + catalysts 独立表

- `thesis` 表新增 `is_active`（布尔）和 `version`（整数）字段。同 symbol 再次创建时旧记录 `is_active=false`，插入新版本；历史版本可查
- `pillars` 存为 JSON 列，每个 pillar 包含 UUID `id` 字段，更新时按 UUID 匹配而非数组下标
- `catalyst_events` 独立表，FK 指向 `thesis.id`；创建新版本 Thesis 时自动把旧版未过期催化剂复制到新版本

**选择原因**：催化剂独立表支撑日历的日期范围 SQL 查询；pillar UUID 避免下标位移 bug；软版本化保留投资决策历史。

### 4. Watchlist：独立于 Thesis 的轻量关注列表

新增 `watchlist` 表（symbol + added_at），是 Morning Note 和催化剂日历的数据来源。Thesis 可选地附加在已关注的股票上，但关注股票不强制要求 Thesis。

入口：股票详情页顶部"关注 / 取消关注"按钮。

**选择原因**：用户可能只想轻量跟踪一只股票而不需要写投资逻辑；Thesis 与日常监控解耦，避免创建无意义的"占位 Thesis"。

### 5. Stock Screener：预计算 stock_fundamentals 表 + 独立刷新脚本

- 新增 `stock_fundamentals` 表：存储每只股票多年财务指标，包含 `report_date`（实际披露日）、`year`、`roe`、`revenue_growth`、`net_profit_growth`、`gross_margin`、`pe`、`pb`、`dividend_yield`、`debt_ratio`、`fcf_ratio` 等字段
- 历史年份（当前年 -2 年及以前）写入后打 `frozen=true` 标记，不再重新拉取
- 新增 `data_sync_status` 表：记录刷新任务进度和状态（`pending` / `running` / `done` / `failed`），支持断点续传
- 新增 `backend/scripts/refresh_fundamentals.py`：独立脚本，不在 Flask 进程内运行。建议每年 5 月 1 日（年报披露截止后）和 11 月 1 日（Q3 季报截止后）手动执行或系统 cron 触发

筛选时直接查 `stock_fundamentals` 表，毫秒级返回。前端展示筛选结果时注明"数据截至 YYYY-MM-DD"。

**PE 条件改为绝对阈值**：`PE < 25`（默认值，可调）而非行业相对值，避免跨行业 JOIN 复杂度。

**ROE 条件**：使用 `stock_fundamentals` 表中多年记录判断连续性，不做实时拉取。

### 6. Morning Note：按需异步生成 + 三态状态机 + 固定 2 次 LLM

- 去掉 APScheduler，改为按需触发：前端请求今日简报时，后端检查 `morning_notes` 表是否有今日 `status=success` 记录
- 无今日记录时：立即写入 `status='generating'` 占位记录，后台异步启动生成，立即返回；前端展示昨日简报 + "生成中"提示，每 5 秒轮询
- `morning_notes.status` 三态：`generating` / `success` / `failed`；失败时前端显示错误提示 + "重试"按钮，停止轮询
- **固定 2 次 LLM 调用**：所有 Watchlist 股票批量做一次 web search，价格变动数据一次性批量拉取，单次 LLM 调用生成覆盖全部股票的简报。调用次数不随 Watchlist 规模增长

**选择原因**：消灭 gunicorn 多 worker 竞争问题；三态状态机防止前端无限轮询；固定 2 次 LLM 控制成本。

### 7. Earnings Preview：共识预期降级为参考估计

优先使用 `ak.stock_analyst_forecast_em()` 获取分析师预测；拿不到时降级到 web search。

结果标注为"参考估计，非精确市场共识"，前端显示免责说明。

**选择原因**：A 股免费渠道无法获取 Bloomberg/Wind 级别的精确共识数据；透明标注比静默使用不可靠数据更负责。

## Risks / Trade-offs

- **akshare 接口稳定性** → 所有 akshare 调用加 try/except，降级返回空列表而非报错
- **Morning Note 内容质量** → 批量处理所有股票，单只股票分析深度不如单独调用；Morning Note 定位为"快速扫一眼"，深度分析由 AI 综合分析承担
- **stock_fundamentals 首次初始化** → 独立脚本约需 15-30 分钟完成全量拉取；数据就绪前 `/screen` 显示"数据未初始化"而非空结果
- **Thesis 版本历史查询** → 当前不暴露历史版本 API，仅在 DB 层保留；一年后如需要，再加 `/api/thesis/<symbol>/history` 接口
- **Earnings Preview 数据质量** → 明确降级定位，前端加免责说明

## Migration Plan

1. 新增数据库表（`watchlist`、`thesis`、`catalyst_events`、`morning_notes`、`stock_fundamentals`、`data_sync_status`）通过 `backend/infra/repositories/` 的初始化逻辑在 app 启动时自动建表
2. `analyze_comprehensive` 保持原有 API 签名和响应结构不变，内部重构
3. 新增路由均为新 URL，无破坏性变更
4. Prompt 模板文件加入 repo，服务重启后生效
5. `refresh_fundamentals.py` 首次运行需手动执行；此后按需执行

## Open Questions

- Morning Note 是否需要支持按用户的 Watchlist 个性化？（当前设计：全局单一 Watchlist，暂不分用户）
- 若未来开放给多人使用，所有新增路由（thesis、watchlist、morning-note、screener、calendar）需补充 API key 或 session 认证后再对外暴露；当前单人本地部署无需处理
