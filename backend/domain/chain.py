"""
Chain domain — AI compute chain types, enums, and constants.
Pure logic, no I/O, no framework imports.
"""

from enum import Enum
from datetime import datetime
from dataclasses import dataclass
from typing import Optional, List


class ChainID(str, Enum):
    AI_COMPUTE = "ai-compute"


class RelationshipStatus(str, Enum):
    VERIFIED = "verified"
    CURATED = "curated"
    CANDIDATE = "candidate"


class EvidenceTier(str, Enum):
    PRIMARY_FACT = "primary_fact"
    SECONDARY_FACT = "secondary_fact"
    BROKER_OPINION = "broker_opinion"
    NEWS_EVENT = "news_event"
    MANUAL_SEED = "manual_seed"
    LLM_CANDIDATE = "llm_candidate"


class ConfidenceBand(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class StrengthBand(str, Enum):
    STRONG = "strong"
    MODERATE = "moderate"
    WEAK = "weak"


class ExposureBand(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    MINIMAL = "minimal"


class StalenessStatus(str, Enum):
    FRESH = "fresh"
    STALE = "stale"
    EXPIRED = "expired"


class ValidationStatus(str, Enum):
    NOT_YET_OBSERVABLE = "not_yet_observable"
    VALIDATED = "validated"
    PARTIALLY_VALIDATED = "partially_validated"
    CONTRADICTED = "contradicted"
    INSUFFICIENT_DATA = "insufficient_data"


class ImpactDirection(str, Enum):
    POSITIVE = "positive"
    NEGATIVE = "negative"
    MIXED = "mixed"
    UNKNOWN = "unknown"


class EventClassification(str, Enum):
    CAPEX_INCREASE = "capex_increase"
    CAPEX_CUT = "capex_cut"
    GPU_NEW_GENERATION = "gpu_new_generation"
    GPU_SUPPLY_CONSTRAINT = "gpu_supply_constraint"
    LIQUID_COOLING_ADOPTION = "liquid_cooling_adoption"
    OPTICAL_SPEED_UPGRADE = "optical_speed_upgrade"
    RAW_MATERIAL_PRICE_UP = "raw_material_price_up"
    RAW_MATERIAL_PRICE_DOWN = "raw_material_price_down"
    EXPORT_RESTRICTION = "export_restriction"
    DOMESTIC_SUBSTITUTION = "domestic_substitution"
    DEMAND_SLOWDOWN = "demand_slowdown"
    MANUAL_REQUIRED = "manual_required"
    UNKNOWN = "unknown"


@dataclass
class ChainNode:
    node_id: str
    chain_id: ChainID
    name: str
    level: str  # L1 or L2
    tier: str = "general"  # core, important, general
    description: Optional[str] = None
    upstream_node_ids: Optional[List[str]] = None
    downstream_node_ids: Optional[List[str]] = None
    key_technologies: Optional[List[str]] = None
    market_size: Optional[str] = None
    concentration: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class CompanyMaster:
    company_id: str
    symbol: str
    exchange: str
    canonical_name: str
    aliases: List[str]
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class CompanyNodeExposure:
    exposure_id: str
    company_id: str
    node_id: str
    chain_id: ChainID
    role: str
    exposure_band: ExposureBand
    business_scope: Optional[str] = None
    evidence_tier: EvidenceTier = EvidenceTier.MANUAL_SEED
    relationship_status: RelationshipStatus = RelationshipStatus.CURATED
    evidence_as_of: Optional[datetime] = None
    last_seen_date: Optional[datetime] = None
    staleness_status: StalenessStatus = StalenessStatus.FRESH
    review_required_after: Optional[datetime] = None
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class ChainEdge:
    edge_id: str
    chain_id: ChainID
    source_node_id: str
    target_node_id: str
    relationship_type: str
    strength_band: StrengthBand
    confidence_band: ConfidenceBand
    direction: str = "downstream"  # upstream, downstream, bidirectional
    layer: str = "general"  # core, important, general
    value_chain_position: Optional[str] = None
    evidence_tier: EvidenceTier = EvidenceTier.MANUAL_SEED
    relationship_status: RelationshipStatus = RelationshipStatus.CURATED
    description: Optional[str] = None
    business_logic: Optional[str] = None
    key_dependencies: Optional[List[str]] = None
    evidence_as_of: Optional[datetime] = None
    last_seen_date: Optional[datetime] = None
    staleness_status: StalenessStatus = StalenessStatus.FRESH
    review_required_after: Optional[datetime] = None
    effective_from: Optional[datetime] = None
    effective_to: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class EventRule:
    rule_id: str
    chain_id: ChainID
    event_type: EventClassification
    affected_node_ids: List[str]
    impact_direction: ImpactDirection
    impact_level: str
    strength_band: StrengthBand
    confidence_band: ConfidenceBand
    time_lag_days: Optional[int] = None
    condition: Optional[str] = None
    exclusion: Optional[str] = None
    risk_factors: Optional[List[str]] = None
    rationale: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class Evidence:
    evidence_id: str
    chain_id: ChainID
    source_type: EvidenceTier
    source_reference: str
    content: str
    confidence_band: ConfidenceBand
    effective_date: Optional[datetime] = None
    expiration_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


@dataclass
class EventAnalysisSnapshot:
    snapshot_id: str
    event_text: str
    normalized_event_type: EventClassification
    event_date: datetime
    classification_confidence_band: ConfidenceBand
    rules_version: str
    chain_data_version: str
    financial_data_as_of: datetime
    result_json: dict
    created_at: Optional[datetime] = None