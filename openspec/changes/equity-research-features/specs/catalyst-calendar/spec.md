## ADDED Requirements

### Requirement: 催化剂事件聚合
系统 SHALL 聚合两类催化剂来源：`catalyst_events` 表中关联活跃 Thesis 的手动事件（manual），以及 akshare 自动获取的财报披露日期（auto）。日历查询通过 SQL 日期范围筛选，不做全表内存扫描。

#### Scenario: 查询指定月份的催化剂
- **WHEN** GET `/api/calendar/events?year=2025&month=10`
- **THEN** 系统 SHALL 通过 SQL 查询 `catalyst_events` 表中 date 在该月范围内的记录，JOIN 活跃 Thesis，合并 akshare 财报日期后返回

#### Scenario: 事件列表包含来源标识
- **WHEN** 返回事件列表
- **THEN** 每个事件 SHALL 包含 `source` 字段（`manual` 表示 `catalyst_events` 表手动记录，`auto` 表示 akshare 自动获取）

#### Scenario: akshare 财报日期获取失败
- **WHEN** akshare 接口不可用
- **THEN** 系统 SHALL 仅返回 manual 来源事件，响应包含 `data_partial: true` 标志，HTTP 状态码 200

---

### Requirement: Watchlist 驱动日历范围
催化剂日历 SHALL 只展示 `watchlist` 表中股票的相关事件，而非所有有 Thesis 的股票。用户可以关注股票但不创建 Thesis，日历仍会显示该股票的自动财报日期。

#### Scenario: 无 Thesis 的关注股票显示自动事件
- **WHEN** Watchlist 中某 symbol 无关联 Thesis
- **THEN** 日历 SHALL 仍展示该 symbol 的 akshare 自动财报日期（source=auto），不展示 manual 事件

#### Scenario: 有 Thesis 的关注股票显示全部事件
- **WHEN** Watchlist 中某 symbol 有活跃 Thesis
- **THEN** 日历 SHALL 展示该 symbol 的 auto 财报日期 + manual 催化剂事件（来自 `catalyst_events` 表，关联该 Thesis）

---

### Requirement: 事件影响等级分级
每个催化剂事件 SHALL 有影响等级（`high` / `medium` / `low`），用于前端视觉区分。

#### Scenario: 财报日期默认影响等级
- **WHEN** akshare 自动生成财报日期事件
- **THEN** 该事件 SHALL 默认影响等级为 `high`

#### Scenario: 手动事件未指定影响等级
- **WHEN** 用户在 Thesis Tracker 中添加催化剂时未指定影响等级
- **THEN** 系统 SHALL 默认为 `medium`

---

### Requirement: 近期催化剂摘要接口
系统 SHALL 提供 GET `/api/calendar/upcoming?days=7` 接口，返回未来 N 天内的催化剂事件，用于 Morning Note 的 `today_events` 字段。

#### Scenario: 查询未来 7 天事件
- **WHEN** GET `/api/calendar/upcoming?days=7`
- **THEN** 系统 SHALL 返回按 date 升序排列的事件列表，仅包含 `date >= today` 且 `date <= today + N days` 的事件

#### Scenario: 无即将到来的事件
- **WHEN** 未来 N 天内无任何催化剂事件
- **THEN** 系统 SHALL 返回空列表，HTTP 状态码 200

---

### Requirement: 前端日历视图
系统 SHALL 在 `/calendar` 路由提供催化剂日历页面，以月视图展示事件，支持影响等级颜色编码。

#### Scenario: 日历月视图布局
- **WHEN** 用户访问 `/calendar`
- **THEN** 前端 SHALL 展示当月日历，有事件的日期格子显示标记点（红色=high、橙色=medium、绿色=low）

#### Scenario: 点击日期查看事件详情
- **WHEN** 用户点击有事件的日期
- **THEN** 前端 SHALL 展开显示该日期的事件列表，每个事件包含 symbol、事件名称、影响等级、来源（manual/auto）和备注

#### Scenario: 跨月导航
- **WHEN** 用户点击"上月"或"下月"按钮
- **THEN** 前端 SHALL 请求对应月份数据并刷新日历视图

#### Scenario: 无关注股票时的空状态
- **WHEN** Watchlist 为空
- **THEN** 前端 SHALL 显示"暂无关注股票，请先在股票详情页点击'关注'"的引导提示
