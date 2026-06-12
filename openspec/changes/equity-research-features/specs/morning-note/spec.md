## ADDED Requirements

### Requirement: 按需异步生成
系统 SHALL 采用按需触发策略生成 Morning Note，不使用进程内定时任务。前端请求今日简报时，后端检查是否存在今日 `status=success` 记录，若无则立即写入 `status='generating'` 占位记录，使用 `threading.Thread(daemon=True)` 启动后台线程执行同步生成函数，线程内通过 `asyncio.run()` 调用 LLM 接口。

#### Scenario: 首次请求今日简报
- **WHEN** GET `/api/morning-note` 且今日无 `status=success` 记录
- **THEN** 系统 SHALL 立即写入今日 `status='generating'` 占位记录，启动后台异步生成任务，返回最近一条 `status=success` 的历史简报（含生成日期），响应中附 `today_status: "generating"`

#### Scenario: 今日简报已生成
- **WHEN** GET `/api/morning-note` 且今日已有 `status=success` 记录
- **THEN** 系统 SHALL 直接返回今日简报，响应中附 `today_status: "success"`

---

### Requirement: 三态状态机
`morning_notes.status` SHALL 支持三个状态：`generating` / `success` / `failed`。

#### Scenario: 生成成功
- **WHEN** 后台生成任务完成
- **THEN** 系统 SHALL 将当日记录的 `status` 更新为 `success`，`content` 写入生成内容

#### Scenario: 生成失败
- **WHEN** LLM 调用失败或超时
- **THEN** 系统 SHALL 将当日记录的 `status` 更新为 `failed`，`content` 保持 null，不覆盖昨日记录
- **THEN** 前端下次轮询时 SHALL 收到 `today_status: "failed"`，停止轮询，显示错误提示和"重试"按钮

#### Scenario: 前端轮询终止条件
- **WHEN** 前端收到 `today_status: "success"` 或 `today_status: "failed"`
- **THEN** 前端 SHALL 停止轮询，不得在 `status=failed` 时持续轮询

---

### Requirement: 固定 2 次 LLM 调用
Morning Note 生成 SHALL 固定为 2 次 LLM 调用，不随 Watchlist 规模线性增长。

#### Scenario: 批量处理所有关注股票
- **WHEN** 后台生成任务启动
- **THEN** 系统 SHALL 对所有 Watchlist 股票一次性批量拉取价格变动数据，将多个股票名称拼合为单一 web search 查询，单次 LLM 调用生成覆盖所有股票的简报内容

#### Scenario: Watchlist 为空时跳过生成
- **WHEN** 生成任务触发时 Watchlist 为空
- **THEN** 系统 SHALL 将当日记录直接更新为 `status='failed'`，错误信息为"无关注股票"

---

### Requirement: 简报内容结构
Morning Note SHALL 包含四个固定部分：`price_overview`、`overnight_news`、`today_events`、`action_bias`。

#### Scenario: 内容存储格式
- **WHEN** Morning Note 生成成功
- **THEN** `content` 字段 SHALL 存储 `{ "raw_text": "<完整 LLM 输出>", "sections": { "price_overview": "...", "overnight_news": "...", "today_events": "...", "action_bias": "..." } }`
- **THEN** `sections` 通过 LLM 输出中的固定 markdown 标题（`## 价格速览`、`## 隔夜动态`、`## 今日待关注`、`## 操作倾向`）分割填充；分割失败时 `sections` 为 null，`raw_text` 保留完整输出

#### Scenario: LLM 输出格式降级
- **WHEN** markdown 标题分割失败（LLM 未按模板输出）
- **THEN** 系统 SHALL 仍将 `status` 更新为 `success`，前端收到 `sections=null` 时降级为展示完整 `raw_text`，不将格式问题视为生成失败

#### Scenario: 价格速览内容
- **WHEN** Morning Note 生成成功且 sections 解析成功
- **THEN** `sections.price_overview` SHALL 包含每只关注股票的前收盘价和涨跌幅

#### Scenario: 隔夜动态内容
- **WHEN** Morning Note 生成成功且 sections 解析成功
- **THEN** `sections.overnight_news` SHALL 包含每只关注股票的 1-2 条重要新闻摘要，若无重大新闻则标注"无重大新闻"

#### Scenario: 操作倾向内容
- **WHEN** Morning Note 生成成功且 sections 解析成功
- **THEN** `sections.action_bias` SHALL 包含对每只关注股票的一句话操作倾向（维持/关注/谨慎）并附 1-2 句理由

---

### Requirement: 查询接口
系统 SHALL 支持查询最新简报、指定日期简报和最近 30 天历史列表。

#### Scenario: 查询最新简报
- **WHEN** GET `/api/morning-note`（不带 date 参数）
- **THEN** 系统 SHALL 返回最近一条 `status=success` 的记录及今日生成状态

#### Scenario: 查询指定日期简报
- **WHEN** GET `/api/morning-note?date=YYYY-MM-DD`
- **THEN** 系统 SHALL 返回该日期的记录，若不存在或非 success 则返回 404

#### Scenario: 查询历史列表
- **WHEN** GET `/api/morning-note/history`
- **THEN** 系统 SHALL 返回最近 30 天的日期列表，每项含 date 和 status（success / failed / generating / missing）

---

### Requirement: 手动触发生成
系统 SHALL 支持通过 POST 手动触发当天的 Morning Note 生成。

#### Scenario: 手动触发
- **WHEN** POST `/api/morning-note/generate`
- **THEN** 系统 SHALL 立即返回 `{ "status": "generating" }`，后台异步启动生成

#### Scenario: 当天已有 success 记录时覆盖
- **WHEN** 手动触发时当天已存在 `status=success` 的记录
- **THEN** 系统 SHALL 将其更新为 `status='generating'` 并重新生成，完成后 `regenerated=true`

---

### Requirement: 前端 Morning Note 页面
系统 SHALL 在 `/morning-note` 路由提供每日简报页面，展示最新简报并支持轮询等待生成。

#### Scenario: 生成中时的体验
- **WHEN** 前端收到 `today_status: "generating"`
- **THEN** 前端 SHALL 展示昨日简报（标注日期）+ "今日简报生成中"提示条，每 5 秒自动轮询 GET `/api/morning-note`

#### Scenario: 生成完成后无缝替换
- **WHEN** 轮询结果 `today_status` 变为 `success`
- **THEN** 前端 SHALL 停止轮询，无缝替换为今日简报内容

#### Scenario: 历史简报导航
- **WHEN** 用户点击"查看历史"
- **THEN** 前端 SHALL 展示最近 30 天的简报日期列表，点击任意日期查看对应内容
