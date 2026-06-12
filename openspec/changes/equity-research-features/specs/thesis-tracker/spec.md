## ADDED Requirements

### Requirement: Watchlist 独立关注列表
系统 SHALL 提供独立的 `watchlist` 表（symbol + added_at），作为 Morning Note 和催化剂日历的数据来源。Watchlist 与 Thesis 解耦，关注股票不强制要求创建 Thesis。

#### Scenario: 关注股票
- **WHEN** 用户在股票详情页点击"关注"按钮
- **THEN** 系统 SHALL 将该 symbol 插入 `watchlist` 表，若已存在则幂等忽略

#### Scenario: 取消关注
- **WHEN** 用户点击"取消关注"按钮
- **THEN** 系统 SHALL 从 `watchlist` 表删除该 symbol 记录（不影响该 symbol 的 Thesis 数据）

#### Scenario: 查询关注列表
- **WHEN** GET `/api/watchlist`
- **THEN** 系统 SHALL 返回所有关注股票的列表，每项包含 symbol、name、added_at，以及是否有关联 Thesis（`has_thesis: boolean`）

---

### Requirement: 创建投资逻辑
用户 SHALL 能够为 Watchlist 中的股票创建结构化投资逻辑（Thesis），包含核心论点、逻辑支柱列表（含 UUID）、风险因素列表、信心评级和止损条件。

#### Scenario: 创建新 Thesis
- **WHEN** 用户 POST `/api/thesis` 并提供 symbol、thesis_statement、pillars、risks
- **THEN** 系统 SHALL 自动将该 symbol 加入 `watchlist` 表（幂等，已存在则忽略）
- **THEN** 系统 SHALL 将 Thesis 持久化到 SQLite，返回含 `id`、`version`、`created_at` 的完整 Thesis 对象
- **THEN** 若该 symbol 已有活跃 Thesis，系统 SHALL 将旧记录 `is_active` 置为 false，插入新版本（version+1），并自动把旧版未过期催化剂复制到新版本

#### Scenario: 创建时缺少必填字段
- **WHEN** POST `/api/thesis` 时缺少 `symbol` 或 `thesis_statement`
- **THEN** 系统 SHALL 返回 400 状态码和字段校验错误信息

---

### Requirement: Pillar UUID 稳定标识
每个 Thesis SHALL 支持 3-5 个逻辑支柱（pillar），每个支柱在创建时由后端生成 UUID `id`，存入 pillars JSON 列，用于后续更新的稳定标识。

#### Scenario: 更新单个支柱状态
- **WHEN** 用户 PATCH `/api/thesis/<symbol>/pillars/<pillar_uuid>` 并传入新状态
- **THEN** 系统 SHALL 按 UUID 匹配 JSON 数组中的目标 pillar，更新其状态并记录 `updated_at` 时间戳

#### Scenario: 删除 pillar 后 UUID 不漂移
- **WHEN** 用户删除某个 pillar 后再更新另一个 pillar
- **THEN** 系统 SHALL 仍然按 UUID 定位目标 pillar，不受数组下标变化影响

#### Scenario: 支柱状态为 invalidated 时的处理
- **WHEN** 任意支柱状态变为 `invalidated`
- **THEN** 系统 SHALL 将 Thesis 整体信心评级自动降至不高于 `low`

---

### Requirement: 催化剂事件独立表
催化剂事件 SHALL 存储在独立的 `catalyst_events` 表中，FK 指向 `thesis.id`，支持按日期范围的 SQL 查询。

#### Scenario: 添加催化剂事件
- **WHEN** 用户 POST `/api/thesis/<symbol>/catalysts` 并提供 date、event、impact
- **THEN** 系统 SHALL 将催化剂插入 `catalyst_events` 表，关联到当前活跃 Thesis 的 id

#### Scenario: 创建新版本 Thesis 时自动继承催化剂
- **WHEN** 用户为已有 Thesis 的 symbol 创建新版本
- **THEN** 系统 SHALL 自动把旧版本中 `date >= today` 的催化剂复制到新版本，过期催化剂不继承

#### Scenario: 删除催化剂
- **WHEN** 用户 DELETE `/api/thesis/<symbol>/catalysts/<catalyst_id>`
- **THEN** 系统 SHALL 从 `catalyst_events` 表删除该记录

---

### Requirement: 信心评级管理
每个 Thesis SHALL 有整体信心评级（`high` / `medium` / `low`），用户可手动调整，pillar 状态变更时系统自动调整。

#### Scenario: 手动更新信心评级
- **WHEN** 用户 PATCH `/api/thesis/<symbol>` 并传入 `conviction` 字段
- **THEN** 系统 SHALL 更新信心评级并记录 `updated_at`

#### Scenario: 查询 Thesis 包含信心评级
- **WHEN** GET `/api/thesis/<symbol>`
- **THEN** 响应 SHALL 包含 `conviction` 字段，值为 `high`、`medium` 或 `low`

---

### Requirement: 查询与列表
系统 SHALL 支持查询单个 symbol 的活跃 Thesis 详情，以及列出所有有活跃 Thesis 的股票。

#### Scenario: 查询存在的 Thesis
- **WHEN** GET `/api/thesis/<symbol>`
- **THEN** 系统 SHALL 返回 `is_active=true` 的 Thesis，包含 pillars、risks、catalysts、conviction、stop_loss、version 字段

#### Scenario: 查询不存在的 Thesis
- **WHEN** GET `/api/thesis/<symbol>` 且该 symbol 无活跃 Thesis
- **THEN** 系统 SHALL 返回 404 状态码

#### Scenario: 列出所有活跃 Thesis
- **WHEN** GET `/api/thesis`
- **THEN** 系统 SHALL 返回所有 `is_active=true` 的 Thesis 摘要列表（symbol、thesis_statement、conviction、version、pillar 状态统计）

---

### Requirement: 前端 Watchlist 关注按钮
股票详情页顶部 SHALL 显示"关注 / 取消关注"按钮，状态实时反映该 symbol 是否在 Watchlist 中。

#### Scenario: 关注状态实时展示
- **WHEN** 用户打开任意股票详情页
- **THEN** 前端 SHALL 读取 Watchlist 状态，已关注显示"取消关注"，未关注显示"关注"

---

### Requirement: 前端 Thesis Tracker Tab
股票详情页 SHALL 新增"投资逻辑"Tab，展示该股票的 Thesis 内容并支持在线编辑。

#### Scenario: 无 Thesis 时的空状态
- **WHEN** 用户打开"投资逻辑"Tab 且该股票无活跃 Thesis
- **THEN** 前端 SHALL 显示"创建投资逻辑"入口，引导用户填写 thesis_statement 和第一批 pillars

#### Scenario: 有 Thesis 时显示看板
- **WHEN** 用户打开"投资逻辑"Tab 且已有活跃 Thesis
- **THEN** 前端 SHALL 以卡片形式展示每个支柱及其状态（绿=on_track / 橙=watch / 红=concerning / 灰=invalidated），以及催化剂列表和信心评级
