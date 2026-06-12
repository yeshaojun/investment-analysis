## ADDED Requirements

### Requirement: Prompt 模板外置
系统 SHALL 将所有 AI 分析的 prompt 文本存储为 `backend/prompts/` 目录下的独立 markdown 文件，Python 代码中不得包含超过 3 行的内联 prompt 文本。

#### Scenario: 服务启动加载模板
- **WHEN** Flask 应用启动
- **THEN** 系统 SHALL 从 `backend/prompts/` 目录读取所有 `.md` 模板文件并缓存到内存

#### Scenario: 模板变量插值
- **WHEN** AI 服务调用某个分析方法时
- **THEN** 系统 SHALL 从内存缓存中取对应模板，使用 `str.format_map()` 注入动态变量后生成最终 prompt

#### Scenario: 模板文件缺失
- **WHEN** 某个 prompt 模板文件不存在
- **THEN** 系统 SHALL 在启动时抛出 `FileNotFoundError` 并中止启动，而非在运行时静默失败

---

### Requirement: 行业分析独立方法
系统 SHALL 提供 `AIService.analyze_sector(symbol, stock_info)` 方法，专注于行业概述、市场规模与增长、竞争格局和政策环境四个维度的分析。

#### Scenario: 正常调用行业分析
- **WHEN** 调用 `analyze_sector` 并传入有效的 symbol 和 stock_info
- **THEN** 系统 SHALL 返回包含 `sector_analysis` 字段的字典，内含行业结构、竞争格局、政策环境的文字分析

#### Scenario: 行业分析 web search
- **WHEN** `analyze_sector` 被调用
- **THEN** 系统 SHALL 通过 `ai_provider.search_and_collect` 搜索该公司所在行业的最新信息后再调用 LLM

---

### Requirement: 财务质量独立分析
系统 SHALL 提供 `AIService.analyze_financials(symbol, stock_info, financial_data)` 方法，专注于盈利能力、成长性、财务健康度和历史趋势分析。

#### Scenario: 有财务数据时的分析
- **WHEN** 传入非空的 `financial_data` 列表
- **THEN** 系统 SHALL 基于近 5 年财务数据输出包含 ROE 趋势、营收增速、毛利率变化的结构化分析

#### Scenario: 无财务数据时的降级
- **WHEN** 传入空的 `financial_data` 列表
- **THEN** 系统 SHALL 返回基于 web search 结果的定性财务分析，并在结果中标注"财务数据不完整"

---

### Requirement: 估值独立分析
系统 SHALL 提供 `AIService.analyze_valuation(symbol, stock_info, financial_data)` 方法，输出 PE/PB 估值、历史估值水位和目标价区间。

#### Scenario: 估值分析输出
- **WHEN** 调用 `analyze_valuation`
- **THEN** 系统 SHALL 返回包含当前估值水平、历史分位、与近 5 年均值偏差的结构化输出

---

### Requirement: 投资逻辑分析独立方法
系统 SHALL 提供 `AIService.build_thesis_analysis(symbol, stock_info, financial_data)` 方法，输出核心投资逻辑、增长驱动、主要风险和投资评级建议。

#### Scenario: 投资逻辑输出格式
- **WHEN** 调用 `build_thesis_analysis`
- **THEN** 系统 SHALL 返回包含 `core_logic`（3-5 个逻辑支柱）、`risks`（2-4 个风险因素）、`rating`（强烈推荐/推荐/中性/不推荐）、`target_price_range` 字段的字典

---

### Requirement: 四方法并发执行与部分失败降级
`analyze_comprehensive` SHALL 使用 `asyncio.gather(..., return_exceptions=True)` 并发调用四个独立分析方法。任意子分析失败时，该维度用占位文本 `[行业分析数据暂时不可用]` 替代，仍继续执行第五次综合叙事调用。响应中附 `partial_failure` 字段列出失败的维度名称。

#### Scenario: 全部成功
- **WHEN** 四个子分析全部成功
- **THEN** `partial_failure` 字段 SHALL 为空列表 `[]`

#### Scenario: 部分失败降级
- **WHEN** 某个子分析抛出异常（如 web search 超时）
- **THEN** 系统 SHALL 用占位文本替换该维度，继续发起第五次综合调用，响应中 `partial_failure` SHALL 包含失败维度名称（如 `["行业分析"]`）

#### Scenario: 全部失败
- **WHEN** 四个子分析全部失败
- **THEN** 系统 SHALL 跳过第五次综合调用，返回错误响应 `{ "error": "所有分析维度均失败" }`

---

### Requirement: 第五次综合叙事调用
`analyze_comprehensive` SHALL 在四个并发分析完成后，发起第五次 LLM 调用，将四个独立分析截断后作为 context，生成连贯的综合叙事，而非简单字符串拼接。每个子分析在传入前 SHALL 截断至最多 800 字，防止输入 token 过多导致静默截断。

#### Scenario: 子分析截断
- **WHEN** `analyze_comprehensive` 准备第五次调用的输入
- **THEN** 系统 SHALL 将每个子分析文本截断至最多 800 字（取前 800 字）后再传入综合 prompt，`synthesis.md` 模板 SHALL 明确标注"基于以下四段摘要综合叙事"

#### Scenario: 综合叙事避免矛盾
- **WHEN** 四个独立分析中存在可能矛盾的表述
- **THEN** 第五次综合调用 SHALL 识别并统一叙事口径，输出逻辑连贯的综合分析

#### Scenario: 综合分析向后兼容
- **WHEN** 调用 `analyze_comprehensive`
- **THEN** 系统 SHALL 返回与现有结构相同的字典（包含 `symbol`、`name`、`analysis`、`current_price`、`industry`、`sources` 字段），`analysis` 字段为综合叙事文本
