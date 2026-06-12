/**
 * AI计算链相关类型定义
 */

// 链节点
export interface ChainNode {
  node_id: string;
  chain_id: string;
  name: string;
  level: string; // L1 or L2
  tier?: string; // core, important, general
  description?: string;
  upstream_node_ids?: string[];
  downstream_node_ids?: string[];
  key_technologies?: string[];
  market_size?: string;
  concentration?: string;
  representative_companies?: CompanyWithExposure[];
}

// 公司基本信息
export interface Company {
  company_id: string;
  symbol: string;
  exchange: string;
  canonical_name: string;
  aliases: string[];
}

// 带曝光信息的公司
export interface CompanyWithExposure extends Company {
  role?: string;
  exposure_band?: string;
  relationship_status?: string;
}

// 曝光记录
export interface CompanyNodeExposure {
  exposure_id: string;
  company_id: string;
  node_id: string;
  chain_id: string;
  role: string;
  exposure_band: string;
  business_scope?: string;
  evidence_tier: string;
  relationship_status: string;
  evidence_as_of?: string;
  last_seen_date?: string;
  staleness_status: string;
  review_required_after?: string;
  effective_from?: string;
  effective_to?: string;
  node?: ChainNode;
}

// 链边
export interface ChainEdge {
  edge_id: string;
  chain_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  direction?: string; // upstream, downstream, bidirectional
  layer?: string; // core, important, general
  value_chain_position?: string;
  strength_band: string;
  confidence_band: string;
  evidence_tier: string;
  relationship_status: string;
  description?: string;
  business_logic?: string;
  key_dependencies?: string[];
  evidence_as_of?: string;
  last_seen_date?: string;
  staleness_status: string;
  review_required_after?: string;
  effective_from?: string;
  effective_to?: string;
}

// 链概览
export interface ChainOverview {
  chain_id: string;
  nodes: ChainNode[];
  edges: ChainEdge[];
  companies: Company[];
  metadata: {
    node_count: number;
    edge_count: number;
    company_count: number;
    loaded_at: string;
  };
}

// 公司链定位
export interface CompanyChainPosition {
  status: 'mapped' | 'unmapped';
  message?: string;
  company_id?: string;
  company?: Company;
  exposures: CompanyNodeExposure[];
  node_count?: number;
  chain_id?: string;
  chain_context?: ChainContext;
}

// 链路上下文
export interface ChainContext {
  upstream_nodes: ChainContextNode[];
  downstream_nodes: ChainContextNode[];
  related_edges: ChainContextEdge[];
}

// 链路节点（带公司信息）
export interface ChainContextNode {
  node_id: string;
  name: string;
  level: string;
  tier: string;
  description: string;
  companies: CompanyWithExposure[];
}

// 链路边
export interface ChainContextEdge {
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  relationship_type: string;
  direction: string;
  layer: string;
  value_chain_position: string;
  description: string;
  business_logic: string;
}

// 事件分类结果
export interface EventClassification {
  event_type: string;
  confidence_band: string;
  matched_keyword?: string;
  method: string;
}

// 影响路径
export interface ImpactPath {
  rule_id: string;
  event_type: string;
  impact_direction: string;
  impact_level: string;
  strength_band: string;
  confidence_band: string;
  affected_node_ids: string[];
  time_lag_days?: number;
  rationale?: string;
}

// 事件影响分析结果
export interface EventImpactAnalysis {
  event_type: string;
  affected_nodes: ChainNode[];
  impact_paths: ImpactPath[];
  affected_node_count: number;
  rule_count: number;
}

// 基本面验证结果
export interface FundamentalValidation {
  status: string;
  symbol: string;
  signals: Record<string, any>;
  validated_at?: string;
  message?: string;
}

// 事件分析快照
export interface EventAnalysisSnapshot {
  snapshot_id: string;
  event_text: string;
  normalized_event_type: string;
  event_date: string;
  classification_confidence_band: string;
  rules_version: string;
  chain_data_version: string;
  financial_data_as_of: string;
  result_json: Record<string, any>;
  created_at: string;
}

// 事件分析请求
export interface AnalyzeEventImpactRequest {
  event_text: string;
  event_date?: string;
}

// 事件分析响应
export interface AnalyzeEventImpactResponse {
  classification: EventClassification;
  impact: EventImpactAnalysis | null;
  fundamental_validation?: Record<string, FundamentalValidation>;
  snapshot?: {
    snapshot_id: string;
    created_at: string;
    status: string;
  };
  message?: string;
}

// 事件规则
export interface EventRule {
  rule_id: string;
  chain_id: string;
  event_type: string;
  affected_node_ids: string[];
  impact_direction: string;
  impact_level: string;
  strength_band: string;
  confidence_band: string;
  time_lag_days?: number;
  condition?: string;
  exclusion?: string;
  risk_factors?: string[];
  rationale?: string;
}

// 证据记录
export interface Evidence {
  evidence_id: string;
  chain_id: string;
  source_type: string;
  source_reference: string;
  content: string;
  confidence_band: string;
  effective_date?: string;
  expiration_date?: string;
}