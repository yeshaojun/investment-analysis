## ADDED Requirements

### Requirement: 预计算 stock_fundamentals 表
系统 SHALL 维护 `stock_fundamentals` 表，主键为 `(symbol, year)` 复合主键，存储每只股票的多年财务指标及估值快照，作为筛选的唯一数据源。历史年份（当前年 -2 及以前）写入后打 `frozen=true`，不再重新拉取。每条记录包含 `report_date`（实际披露日期）字段。PE、PB、股息率存为周度快照（含 `pe_snapshot_date` 字段），最多 7 天延迟，对基本面选股可接受。刷新脚本使用 `INSERT OR REPLACE` 幂等写入，`frozen=true` 的行跳过。筛选时完全走 DB，不实时调用 akshare。

#### Scenario: 筛选时使用预计算数据
- **WHEN** 用户发起筛选请求
- **THEN** 系统 SHALL 直接查询 `stock_fundamentals` 表，不实时调用 akshare，响应时间 SHALL 在 2 秒内

#### Scenario: 筛选结果展示数据截止日期
- **WHEN** 筛选结果返回
- **THEN** 响应 SHALL 包含 `data_as_of` 字段，值为 `stock_fundamentals` 表中最新 `report_date`，前端展示"数据截至 YYYY-MM-DD"

---

### Requirement: 独立刷新脚本
系统 SHALL 提供 `backend/scripts/refresh_fundamentals.py` 独立脚本，不在 Flask 进程内运行。脚本复用 `AKShareProvider._a_financials_abstract()` 获取多年财务指标（ROE、营收增速、毛利率等），同时从 `ak.stock_zh_a_spot_em()` 一次性拉取全量 PE、PB、股息率快照并写入同一张表。脚本支持断点续传，通过 `data_sync_status` 表记录进度。

#### Scenario: 断点续传
- **WHEN** 刷新脚本上次运行中断后重新执行
- **THEN** 脚本 SHALL 从 `data_sync_status.progress` 记录的断点位置继续拉取，跳过已完成的股票

#### Scenario: frozen 记录不重复拉取
- **WHEN** 刷新脚本运行
- **THEN** 脚本 SHALL 跳过 `frozen=true` 的历史年份记录，只刷新近 2 个财年的数据

#### Scenario: 数据同步状态可查
- **WHEN** GET `/api/screener/sync-status`
- **THEN** 系统 SHALL 返回 `data_sync_status` 中 `task='stock_fundamentals'` 的记录（status、progress、total、started_at、finished_at）

---

### Requirement: 预设筛选套餐
系统 SHALL 提供价值股、成长股、质量股三套预设筛选条件，每套条件包含多个可调阈值的量化指标。所有阈值为绝对值而非行业相对值。

#### Scenario: 使用预设成长股筛选
- **WHEN** 用户 POST `/api/screener/screen` 并传入 `preset: "growth"`
- **THEN** 系统 SHALL 默认使用以下条件：营收增速 > 15%、净利增速 > 20%、ROE（最新年）> 15%

#### Scenario: 使用预设价值股筛选
- **WHEN** 用户传入 `preset: "value"`
- **THEN** 系统 SHALL 默认使用以下条件：PE < 25、PB < 1.5、股息率 > 3%

#### Scenario: 使用预设质量股筛选
- **WHEN** 用户传入 `preset: "quality"`
- **THEN** 系统 SHALL 默认使用以下条件：毛利率 > 30%、经营现金流/净利润 > 0.8、资产负债率 < 40%、近 3 年 ROE 均 > 15%（查 `stock_fundamentals` 多年记录）

---

### Requirement: 多年 ROE 连续判断
质量套餐的 ROE 条件 SHALL 基于 `stock_fundamentals` 表的多年记录判断连续性，不做实时拉取。

#### Scenario: 连续 3 年 ROE 均达标
- **WHEN** 质量套餐筛选执行
- **THEN** 系统 SHALL 对每只股票查询最近 3 个 `report_date` 不同年份的记录，仅当所有年份 ROE 均 > 15% 时才通过该条件

#### Scenario: 数据不足 3 年时的处理
- **WHEN** 某只股票在 `stock_fundamentals` 中历史记录不足 3 年
- **THEN** 系统 SHALL 将该股票标记为"数据不足"并排除出质量套餐结果

---

### Requirement: 可调阈值
每套预设的每个指标阈值 SHALL 支持用户通过请求参数覆盖，系统对传入阈值进行合理范围校验。

#### Scenario: 覆盖单个阈值
- **WHEN** 用户传入 `preset: "growth"` 并附带 `overrides: {"revenue_growth_min": 25}`
- **THEN** 系统 SHALL 使用 25% 替代默认 15% 作为营收增速下限

#### Scenario: 阈值超出合理范围
- **WHEN** 用户传入负数的 ROE 最小值或 > 100% 的毛利率
- **THEN** 系统 SHALL 返回 400 并提示校验错误

---

### Requirement: 筛选结果排序
筛选结果 SHALL 按各套餐核心指标降序排列，最多返回 50 条。

#### Scenario: 成长套餐排序
- **WHEN** 成长套餐筛选完成
- **THEN** 结果 SHALL 按营收增速降序排列

#### Scenario: 价值套餐排序
- **WHEN** 价值套餐筛选完成
- **THEN** 结果 SHALL 按股息率降序排列

#### Scenario: 质量套餐排序
- **WHEN** 质量套餐筛选完成
- **THEN** 结果 SHALL 按最新年 ROE 降序排列

---

### Requirement: 数据未就绪时的明确提示
当 `stock_fundamentals` 表为空或 `data_sync_status.status` 为 `pending` / `never` 时，系统 SHALL 返回明确提示而非空结果。

#### Scenario: 数据未初始化
- **WHEN** 筛选请求到达但 `stock_fundamentals` 表为空
- **THEN** 系统 SHALL 返回 503，body 包含 `{ "message": "基本面数据尚未初始化，请先运行 refresh_fundamentals.py", "sync_status": "never" }`

---

### Requirement: 前端选股筛选页面
系统 SHALL 在 `/screen` 路由提供选股筛选页面，支持套餐选择、阈值调整和结果展示。

#### Scenario: 数据未就绪时的页面提示
- **WHEN** 用户访问 `/screen` 且数据未初始化
- **THEN** 前端 SHALL 显示"基本面数据未就绪"提示，而非显示空结果表格

#### Scenario: 筛选结果展示
- **WHEN** 筛选完成
- **THEN** 前端 SHALL 以表格形式展示结果，包含股票名称、行业、各项指标值及数据截止日期，每行可点击跳转股票详情页

#### Scenario: 无结果状态
- **WHEN** 筛选条件过严导致零结果
- **THEN** 前端 SHALL 提示"当前条件下无符合股票，建议适当放宽阈值"并高亮最严格的条件
