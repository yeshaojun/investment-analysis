## ADDED Requirements

### Requirement: 财报前瞻分析
系统 SHALL 为指定股票和报告季生成财报前瞻分析，包含参考共识预期表、关键指标清单、三情景分析和催化剂清单。

#### Scenario: 生成财报前瞻
- **WHEN** 用户 POST `/api/ai/earnings-preview` 并传入 `symbol`、`quarter`（如 "2025Q1"）
- **THEN** 系统 SHALL 优先调用 `ak.stock_analyst_forecast_em()` 获取分析师预测，失败时降级为 web search，使用 LLM 生成结构化前瞻分析
- **THEN** 响应 SHALL 包含 `consensus`、`key_metrics`、`scenarios`、`catalysts`、`data_source` 五个字段

#### Scenario: 共识数据来源标注
- **WHEN** 财报前瞻生成成功
- **THEN** `data_source` 字段 SHALL 标注数据来源（`"analyst_forecast"`或`"web_search"`）及免责说明"共识数据来源于公开信息，仅供参考，非精确市场共识"

---

### Requirement: 共识预期降级处理
系统 SHALL 明确区分精确分析师数据和 web search 估计数据，前端展示时加免责说明。

#### Scenario: akshare 分析师预测可用
- **WHEN** `ak.stock_analyst_forecast_em()` 返回有效数据
- **THEN** `consensus` 字段 SHALL 使用该数据，`data_source` 标注为 `"analyst_forecast"`

#### Scenario: akshare 分析师预测不可用
- **WHEN** `ak.stock_analyst_forecast_em()` 调用失败或返回空
- **THEN** 系统 SHALL 通过 web search 获取参考估计，`consensus` 字段值标注为"参考估计"，`data_source` 标注为 `"web_search"`

---

### Requirement: 三情景分析
财报前瞻 SHALL 包含 Bull / Base / Bear 三个情景，每个情景包含核心假设、营收预测、EPS 预测、股价预期反应（含量化区间）。

#### Scenario: 三情景完整性
- **WHEN** 财报前瞻生成成功
- **THEN** `scenarios` 字段 SHALL 包含恰好三个元素，每个含 `type`（bull/base/bear）、`revenue`、`eps`、`key_driver`、`stock_reaction`（如"+5%~+8%"）字段

#### Scenario: 股价反应量化
- **WHEN** 情景中包含 stock_reaction 字段
- **THEN** 该字段 SHALL 包含预期涨跌幅区间（如"+5%~+8%"）而非仅描述性文字

---

### Requirement: 关键指标清单
财报前瞻 SHALL 输出该股票财报时最值得关注的 3-5 个核心指标，并说明每个指标的关注原因。指标与行业相关：科技/SaaS 优先 ARR、NRR 等；消费/制造优先毛利率、库存周转等。

#### Scenario: 行业相关指标
- **WHEN** 前瞻分析针对科技/SaaS 类公司
- **THEN** `key_metrics` SHALL 优先包含 ARR、净收入留存率、用户数等 SaaS 指标

---

### Requirement: 结果缓存
相同 symbol + quarter 的前瞻结果 SHALL 缓存 24h，避免重复 LLM 调用。

#### Scenario: 命中缓存
- **WHEN** 相同 symbol + quarter 在 24h 内再次请求
- **THEN** 系统 SHALL 直接返回缓存结果，不重新调用 LLM

---

### Requirement: 前端财报前瞻 Tab
股票详情页 SHALL 新增"财报前瞻"Tab，支持季度选择后触发分析，以结构化卡片展示结果及免责说明。

#### Scenario: 触发前瞻分析
- **WHEN** 用户在"财报前瞻"Tab 选择季度并点击"生成前瞻"
- **THEN** 前端 SHALL 显示加载状态，完成后展示三情景对比表和关键指标卡片

#### Scenario: 免责说明展示
- **WHEN** 前瞻分析结果展示
- **THEN** 前端 SHALL 在共识预期数据旁显示 `data_source` 的免责说明文字
