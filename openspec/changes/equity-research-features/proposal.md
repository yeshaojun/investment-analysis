## Why

当前平台的 AI 分析是一个单次调用的大段输出，缺乏结构化的投资逻辑追踪、选股筛选、事件前瞻等主动研究工具。参考 anthropics/financial-services 仓库的 equity-research skill 体系，补齐这些能力可以将平台从"被动查询"升级为"主动研究工具"。

## What Changes

- 将 `ai_service.py` 的单一综合分析拆分为 sector / financials / valuation / thesis 四个独立分析方法
- 将所有 prompt 模板从 Python 代码中提取到 `backend/prompts/` 目录的 markdown 文件
- 新增 Thesis Tracker：对关注股票维护结构化投资逻辑，支持逻辑支柱状态追踪、风险记录、催化剂管理和信心评级
- 新增 Earnings Preview：财报前瞻分析，包含共识预期、关键指标框架、三情景分析和催化剂清单
- 新增选股筛选页面 `/screen`：基于 akshare 数据的价值 / 成长 / 质量三套量化筛选标准
- 新增催化剂日历：关注股票的重大事件日历视图，按高 / 中 / 低影响分级
- 新增 Morning Note：用户自选股的每日开盘前动态简报，定时任务生成

## Capabilities

### New Capabilities

- `ai-analysis-modular`: 将综合分析拆成 sector / financials / valuation / thesis 四个独立 API 方法；prompt 模板外置到 `backend/prompts/*.md`，Python 只负责变量插值
- `thesis-tracker`: 结构化投资逻辑管理，支持创建 / 更新 thesis（逻辑支柱 + 状态、风险因素、催化剂事件、信心评级、止损条件），持久化到 SQLite
- `earnings-preview`: 财报前瞻分析，给定股票和报告季，输出共识预期表、关键指标清单、Bull/Base/Bear 三情景和催化剂清单
- `stock-screener`: `/screen` 页面，提供价值 / 成长 / 质量三套预设筛选条件，基于 akshare 行业财务数据批量筛选并返回结果列表
- `catalyst-calendar`: 关注股票的重大事件日历，聚合财报日期、股东大会、重大公告等，按 high / medium / low 影响等级展示
- `morning-note`: 定时（每日 7:00）对用户自选股生成隔夜动态简报，包含价格变动、重要新闻、当日待关注事件和一个明确操作倾向

### Modified Capabilities

（无现有 spec 需要修改）

## Impact

**后端**
- `backend/services/ai_service.py`：重构为多方法，新增 `analyze_sector`、`analyze_financials`、`analyze_valuation`、`build_thesis`
- `backend/prompts/`：新目录，存放 `sector.md`、`financials.md`、`valuation.md`、`thesis.md`、`earnings_preview.md`、`morning_note.md`
- `backend/services/`：新增 `thesis_service.py`、`screener_service.py`、`calendar_service.py`、`morning_note_service.py`
- `backend/infra/repositories/`：新增 `thesis_repo.py`（SQLite 持久化）
- `backend/api/routes/`：新增 `thesis.py`、`screener.py`、`calendar.py`、`morning_note.py`
- `backend/infra/providers/akshare_provider.py`：扩展批量财务数据接口支持筛选

**前端**
- 新增页面：`/screen`（选股筛选）、`/calendar`（催化剂日历）、`/morning-note`（每日简报）
- 股票详情页新增 Tab：Thesis Tracker、Earnings Preview

**数据库**
- 新增 `thesis` 表、`thesis_pillars` 表、`catalyst_events` 表

**依赖**
- 后端新增 `APScheduler` 或 `schedule`（Morning Note 定时任务）
