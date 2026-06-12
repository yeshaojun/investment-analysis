"""
Chain service — business orchestration layer for AI compute chain.
Loads seed data, provides chain overview, company positioning, and event impact analysis.
"""

import json
import logging
import uuid
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any

from domain.chain import (
    ConfidenceBand, EventClassification
)

logger = logging.getLogger(__name__)

# Seed data directory
SEED_DIR = Path(__file__).parent.parent / 'seed_data'

# Snapshot storage directory
SNAPSHOT_DIR = Path(__file__).parent.parent / 'data' / 'snapshots'


class ChainService:
    """Service for AI compute chain operations."""

    def __init__(self, seed_dir: Path = None):
        self.seed_dir = seed_dir or SEED_DIR
        self._snapshot_dir = SNAPSHOT_DIR
        self._chain_nodes: Optional[List[Dict]] = None
        self._company_master: Optional[List[Dict]] = None
        self._company_node_exposures: Optional[List[Dict]] = None
        self._chain_edges: Optional[List[Dict]] = None
        self._event_rules: Optional[List[Dict]] = None
        self._evidence: Optional[List[Dict]] = None

        # Index maps for fast lookup
        self._node_map: Optional[Dict[str, Dict]] = None
        self._company_map: Optional[Dict[str, Dict]] = None
        self._exposure_map: Optional[Dict[str, Dict]] = None
        self._edge_map: Optional[Dict[str, Dict]] = None
        self._rule_map: Optional[Dict[str, Dict]] = None
        self._evidence_map: Optional[Dict[str, Dict]] = None

        # Reverse indexes
        self._company_exposures: Optional[Dict[str, List[Dict]]] = None
        self._node_exposures: Optional[Dict[str, List[Dict]]] = None

    def _load_json(self, filename: str) -> List[Dict]:
        """Load JSON file from seed directory."""
        filepath = self.seed_dir / filename
        if not filepath.exists():
            logger.error(f"Seed file not found: {filepath}")
            return []

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading {filename}: {e}")
            return []

    def _ensure_loaded(self):
        """Ensure all seed data is loaded."""
        if self._chain_nodes is None:
            logger.info("Loading chain seed data")

            self._chain_nodes = self._load_json('chain_nodes.json')
            self._company_master = self._load_json('company_master.json')
            self._company_node_exposures = self._load_json('company_node_exposures.json')
            self._chain_edges = self._load_json('chain_edges.json')
            self._event_rules = self._load_json('event_rules.json')
            self._evidence = self._load_json('evidence.json')

            # Build index maps
            self._node_map = {n['node_id']: n for n in self._chain_nodes}
            self._company_map = {c['company_id']: c for c in self._company_master}
            self._exposure_map = {e['exposure_id']: e for e in self._company_node_exposures}
            self._edge_map = {e['edge_id']: e for e in self._chain_edges}
            self._rule_map = {r['rule_id']: r for r in self._event_rules}
            self._evidence_map = {e['evidence_id']: e for e in self._evidence}

            # Build reverse indexes
            self._company_exposures = {}
            for exposure in self._company_node_exposures:
                company_id = exposure['company_id']
                if company_id not in self._company_exposures:
                    self._company_exposures[company_id] = []
                self._company_exposures[company_id].append(exposure)

            self._node_exposures = {}
            for exposure in self._company_node_exposures:
                node_id = exposure['node_id']
                if node_id not in self._node_exposures:
                    self._node_exposures[node_id] = []
                self._node_exposures[node_id].append(exposure)

            logger.info(f"Loaded {len(self._chain_nodes)} nodes, "
                        f"{len(self._company_master)} companies, "
                        f"{len(self._company_node_exposures)} exposures, "
                        f"{len(self._chain_edges)} edges, "
                        f"{len(self._event_rules)} rules, "
                        f"{len(self._evidence)} evidence records")

    def get_chain_overview(self, chain_id: str = "ai-compute") -> Dict[str, Any]:
        """
        Get AI compute chain overview as structured JSON.

        Returns:
            Dictionary containing nodes, companies, edges, and metadata.
        """
        self._ensure_loaded()

        logger.info(f"Getting chain overview for chain_id={chain_id}")

        # Filter for specified chain
        nodes = [n for n in self._chain_nodes if n['chain_id'] == chain_id]
        edges = [e for e in self._chain_edges if e['chain_id'] == chain_id]

        # Get companies with exposures in this chain
        chain_company_ids = set()
        for exposure in self._company_node_exposures:
            if exposure['chain_id'] == chain_id:
                chain_company_ids.add(exposure['company_id'])

        companies = [c for c in self._company_master if c['company_id'] in chain_company_ids]

        # Add representative companies to nodes
        nodes_with_companies = []
        for node in nodes:
            node_data = node.copy()
            node_id = node['node_id']

            # Get companies exposed to this node
            node_company_ids = set()
            for exposure in self._company_node_exposures:
                if exposure['node_id'] == node_id and exposure['chain_id'] == chain_id:
                    node_company_ids.add(exposure['company_id'])

            # Get company details
            node_companies = []
            for company_id in node_company_ids:
                if company_id in self._company_map:
                    company = self._company_map[company_id].copy()
                    # Get exposure details
                    for exposure in self._company_node_exposures:
                        if (exposure['company_id'] == company_id
                                and exposure['node_id'] == node_id
                                and exposure['chain_id'] == chain_id):
                            company['role'] = exposure.get('role')
                            company['exposure_band'] = exposure.get('exposure_band')
                            company['relationship_status'] = exposure.get('relationship_status')
                            break
                    node_companies.append(company)

            node_data['representative_companies'] = node_companies
            nodes_with_companies.append(node_data)

        logger.info(f"Chain overview loaded: {len(nodes)} nodes, {len(edges)} edges, {len(companies)} companies")

        return {
            'chain_id': chain_id,
            'nodes': nodes_with_companies,
            'edges': edges,
            'companies': companies,
            'metadata': {
                'node_count': len(nodes),
                'edge_count': len(edges),
                'company_count': len(companies),
                'loaded_at': datetime.now().isoformat()
            }
        }

    def get_company_chain_position(self, symbol: str = None,
                                   company_name: str = None) -> Dict[str, Any]:
        """
        Get company's position in the AI compute chain.

        Args:
            symbol: Stock symbol
            company_name: Company name (canonical or alias)

        Returns:
            Dictionary with company info, node exposures, and relationships.
        """
        self._ensure_loaded()

        logger.info(f"Getting company chain position for symbol={symbol}, company_name={company_name}")

        # Find company by symbol or name
        company = None
        for c in self._company_master:
            if symbol and c.get('symbol') == symbol:
                company = c
                break
            if company_name:
                if (c.get('canonical_name') == company_name
                        or company_name in c.get('aliases', [])):
                    company = c
                    break

        if not company:
            logger.info(f"Company not found: {symbol or company_name}")
            return {
                'status': 'unmapped',
                'message': f'Company not found: {symbol or company_name}',
                'company_id': None,
                'exposures': []
            }

        company_id = company['company_id']

        # Get company exposures
        exposures = self._company_exposures.get(company_id, [])

        # Enrich exposures with node and evidence details
        enriched_exposures = []
        for exposure in exposures:
            enriched = exposure.copy()

            # Add node details
            node_id = exposure['node_id']
            if node_id in self._node_map:
                enriched['node'] = self._node_map[node_id]

            enriched_exposures.append(enriched)

        # Build upstream/downstream chain context
        chain_context = self._build_chain_context(enriched_exposures)

        logger.info(f"Company chain position loaded: {company_id}, {len(enriched_exposures)} exposures")

        return {
            'status': 'mapped',
            'company': company,
            'exposures': enriched_exposures,
            'node_count': len(enriched_exposures),
            'chain_id': 'ai-compute',
            'chain_context': chain_context
        }

    def _build_chain_context(self, exposures: List[Dict]) -> Dict[str, Any]:
        """Build upstream/downstream chain context for a company's exposures."""
        upstream_nodes = {}
        downstream_nodes = {}
        related_edges = []

        for exposure in exposures:
            node_id = exposure.get('node_id')
            node = self._node_map.get(node_id, {})

            # Collect upstream nodes
            for up_id in node.get('upstream_node_ids', []):
                if up_id not in upstream_nodes:
                    up_node = self._node_map.get(up_id, {})
                    upstream_nodes[up_id] = {
                        'node_id': up_id,
                        'name': up_node.get('name', up_id),
                        'level': up_node.get('level', ''),
                        'tier': up_node.get('tier', ''),
                        'description': up_node.get('description', ''),
                        'companies': self._get_node_companies(up_id)
                    }

            # Collect downstream nodes
            for down_id in node.get('downstream_node_ids', []):
                if down_id not in downstream_nodes:
                    down_node = self._node_map.get(down_id, {})
                    downstream_nodes[down_id] = {
                        'node_id': down_id,
                        'name': down_node.get('name', down_id),
                        'level': down_node.get('level', ''),
                        'tier': down_node.get('tier', ''),
                        'description': down_node.get('description', ''),
                        'companies': self._get_node_companies(down_id)
                    }

        # Collect edges between upstream, current, and downstream nodes
        all_node_ids = set(upstream_nodes.keys()) | set(downstream_nodes.keys()) | {e.get('node_id') for e in exposures}
        for edge in self._chain_edges:
            if edge.get('source_node_id') in all_node_ids or edge.get('target_node_id') in all_node_ids:
                related_edges.append({
                    'edge_id': edge.get('edge_id'),
                    'source_node_id': edge.get('source_node_id'),
                    'target_node_id': edge.get('target_node_id'),
                    'relationship_type': edge.get('relationship_type'),
                    'direction': edge.get('direction', 'downstream'),
                    'layer': edge.get('layer', 'general'),
                    'value_chain_position': edge.get('value_chain_position', ''),
                    'description': edge.get('description', ''),
                    'business_logic': edge.get('business_logic', '')
                })

        return {
            'upstream_nodes': list(upstream_nodes.values()),
            'downstream_nodes': list(downstream_nodes.values()),
            'related_edges': related_edges
        }

    def _get_node_companies(self, node_id: str) -> List[Dict]:
        """Get companies associated with a node."""
        companies = []
        for exposure in self._company_node_exposures:
            if exposure.get('node_id') == node_id and exposure.get('chain_id') == 'ai-compute':
                company_id = exposure.get('company_id')
                if company_id in self._company_map:
                    company = self._company_map[company_id].copy()
                    company['role'] = exposure.get('role')
                    company['exposure_band'] = exposure.get('exposure_band')
                    companies.append(company)
        return companies

    def get_event_rules(self, event_type: str = None) -> List[Dict]:
        """
        Get event rules, optionally filtered by event type.

        Args:
            event_type: Optional event type to filter by

        Returns:
            List of event rules
        """
        self._ensure_loaded()

        if event_type:
            return [r for r in self._event_rules if r['event_type'] == event_type]

        return self._event_rules

    def classify_event(self, event_text: str) -> Dict[str, Any]:
        """
        Classify an event into a controlled event type.

        Uses keyword matching for deterministic classification.
        Returns manual_required for unsupported events.

        Args:
            event_text: Event description text

        Returns:
            Dictionary with event_type, confidence, and classification details
        """
        self._ensure_loaded()

        logger.info(f"Classifying event: {event_text[:100]}...")

        event_text_lower = event_text.lower()

        # Keyword-based classification
        keywords_map = {
            EventClassification.CAPEX_INCREASE.value: [
                'capital expenditure', 'capex', '资本开支', '资本支出',
                'investment', '投资', '采购', 'procurement'
            ],
            EventClassification.CAPEX_CUT.value: [
                'capex cut', 'capital reduction', '资本削减', '削减开支',
                'cost reduction', '降低成本'
            ],
            EventClassification.GPU_NEW_GENERATION.value: [
                'new gpu', 'gpu launch', 'gpu release', '新gpu', 'gpu发布',
                'next generation gpu', '新一代gpu'
            ],
            EventClassification.GPU_SUPPLY_CONSTRAINT.value: [
                'gpu shortage', 'gpu supply', 'gpu供应', 'gpu短缺',
                'supply constraint', '供应受限'
            ],
            EventClassification.LIQUID_COOLING_ADOPTION.value: [
                'liquid cooling', '液冷', '浸没式冷却', 'immersion cooling',
                'cooling solution', '散热方案'
            ],
            EventClassification.OPTICAL_SPEED_UPGRADE.value: [
                'optical upgrade', '800g', '400g', '光模块升级',
                'speed upgrade', '速率升级'
            ],
            EventClassification.RAW_MATERIAL_PRICE_UP.value: [
                'raw material price', '原材料价格', '成本上升',
                'price increase', '涨价'
            ],
            EventClassification.RAW_MATERIAL_PRICE_DOWN.value: [
                'raw material cost', '原材料成本', '成本下降',
                'price decrease', '降价'
            ],
            EventClassification.EXPORT_RESTRICTION.value: [
                'export restriction', '出口限制', 'sanctions', '制裁',
                'trade restriction', '贸易限制'
            ],
            EventClassification.DOMESTIC_SUBSTITUTION.value: [
                'domestic substitution', '国产替代', '本地化',
                'localization', '自主可控'
            ],
            EventClassification.DEMAND_SLOWDOWN.value: [
                'demand slowdown', '需求放缓', '需求下降',
                'market slowdown', '市场放缓'
            ]
        }

        # Check for keyword matches
        for event_type, keywords in keywords_map.items():
            for keyword in keywords:
                if keyword in event_text_lower:
                    return {
                        'event_type': event_type,
                        'confidence_band': ConfidenceBand.HIGH.value,
                        'matched_keyword': keyword,
                        'method': 'keyword_match'
                    }

        # No match found
        return {
            'event_type': EventClassification.MANUAL_REQUIRED.value,
            'confidence_band': ConfidenceBand.LOW.value,
            'matched_keyword': None,
            'method': 'no_match'
        }

    def propagate_event_impact(self, event_type: str,
                               event_date: datetime = None) -> Dict[str, Any]:
        """
        Propagate event impact through chain nodes.

        Uses rule-first propagation with controlled event types.

        Args:
            event_type: Classified event type
            event_date: Optional event date for time-based validation

        Returns:
            Dictionary with affected nodes, paths, and impact details
        """
        self._ensure_loaded()

        logger.info(f"Propagating event impact for event_type={event_type}")

        # Find matching rules
        matching_rules = [r for r in self._event_rules if r['event_type'] == event_type]

        if not matching_rules:
            logger.info(f"No rules found for event_type={event_type}")
            return {
                'event_type': event_type,
                'affected_nodes': [],
                'impact_paths': [],
                'status': 'no_rules_found'
            }

        # Collect affected nodes from all matching rules
        affected_node_ids = set()
        for rule in matching_rules:
            affected_node_ids.update(rule.get('affected_node_ids', []))

        # Get affected node details
        affected_nodes = []
        for node_id in affected_node_ids:
            if node_id in self._node_map:
                node = self._node_map[node_id].copy()

                # Get companies exposed to this node
                node_companies = []
                for exposure in self._company_node_exposures:
                    if (exposure['node_id'] == node_id
                            and exposure['chain_id'] == 'ai-compute'):
                        company_id = exposure['company_id']
                        if company_id in self._company_map:
                            company = self._company_map[company_id].copy()
                            company['exposure_details'] = exposure
                            node_companies.append(company)

                node['exposed_companies'] = node_companies
                affected_nodes.append(node)

        # Build impact paths
        impact_paths = []
        for rule in matching_rules:
            path = {
                'rule_id': rule['rule_id'],
                'event_type': rule['event_type'],
                'impact_direction': rule['impact_direction'],
                'impact_level': rule['impact_level'],
                'strength_band': rule['strength_band'],
                'confidence_band': rule['confidence_band'],
                'affected_node_ids': rule['affected_node_ids'],
                'time_lag_days': rule.get('time_lag_days'),
                'rationale': rule.get('rationale')
            }
            impact_paths.append(path)

        logger.info(f"Event impact propagated: {len(affected_nodes)} affected nodes, {len(matching_rules)} rules")

        return {
            'event_type': event_type,
            'affected_nodes': affected_nodes,
            'impact_paths': impact_paths,
            'affected_node_count': len(affected_nodes),
            'rule_count': len(matching_rules)
        }

    def get_evidence(self, evidence_id: str = None) -> List[Dict]:
        """
        Get evidence records, optionally filtered by ID.

        Args:
            evidence_id: Optional evidence ID to filter by

        Returns:
            List of evidence records
        """
        self._ensure_loaded()

        if evidence_id and evidence_id in self._evidence_map:
            return [self._evidence_map[evidence_id]]

        return self._evidence

    def validate_fundamentals(self, symbol: str,
                              event_date: datetime = None,
                              time_lag_days: int = None) -> Dict[str, Any]:
        """
        Validate company fundamentals against chain thesis.

        Uses existing financial data service to validate recent-quarter signals.
        Does not validate stock price performance or produce investment scores.

        Args:
            symbol: Stock symbol
            event_date: Optional event date for time-based validation
            time_lag_days: Optional time lag in days for event-specific validation

        Returns:
            Dictionary with validation status and signals
        """
        self._ensure_loaded()

        logger.info(f"Validating fundamentals for symbol={symbol}")

        # Import stock service for financial data
        from services.stock_service import stock_service

        try:
            # Get financial data
            financial_data = stock_service.get_financial_data(symbol)

            if not financial_data:
                logger.info(f"No financial data available for {symbol}")
                return {
                    'status': 'insufficient_data',
                    'message': 'No financial data available',
                    'signals': {}
                }

            # Sort by year and quarter
            sorted_data = sorted(financial_data, key=lambda x: (x.get('year', 0), x.get('quarter', 0)))

            if not sorted_data:
                logger.info(f"No financial reports found for {symbol}")
                return {
                    'status': 'insufficient_data',
                    'message': 'No financial reports found',
                    'signals': {}
                }

            # Get latest report
            latest = sorted_data[-1]

            # Calculate signals
            signals = {}

            # Revenue YoY trend
            revenue_yoy = latest.get('revenue_yoy')
            if revenue_yoy is not None:
                signals['revenue_yoy'] = revenue_yoy
                signals['revenue_trend'] = 'positive' if revenue_yoy > 0 else 'negative'

            # Profit YoY trend
            profit_yoy = latest.get('profit_yoy')
            if profit_yoy is not None:
                signals['profit_yoy'] = profit_yoy
                signals['profit_trend'] = 'positive' if profit_yoy > 0 else 'negative'

            # Margin direction (simplified)
            revenue = latest.get('revenue', 0)
            net_profit = latest.get('net_profit', 0)
            if revenue > 0:
                margin = (net_profit / revenue) * 100
                signals['net_margin'] = round(margin, 2)
                signals['margin_direction'] = 'positive' if margin > 0 else 'negative'

            # Cash flow quality (simplified - check if operating cash flow is positive)
            operating_cash_flow = latest.get('operating_cash_flow')
            if operating_cash_flow is not None:
                signals['operating_cash_flow'] = operating_cash_flow
                signals['cash_flow_quality'] = 'positive' if operating_cash_flow > 0 else 'negative'

            # Data availability
            signals['data_available'] = True
            signals['report_year'] = latest.get('year')
            signals['report_quarter'] = latest.get('quarter')

            # Determine validation status
            status = 'validated'

            # Check for negative signals
            if signals.get('revenue_trend') == 'negative':
                status = 'partially_validated'
            if signals.get('profit_trend') == 'negative':
                status = 'partially_validated'
            if signals.get('margin_direction') == 'negative':
                status = 'partially_validated'

            # Check if financial data is available after event date
            if event_date and time_lag_days:
                # Calculate observable window start
                from datetime import timedelta
                observable_start = event_date + timedelta(days=time_lag_days)

                # Check if latest report is after observable start
                report_date = None
                if latest.get('year') and latest.get('quarter'):
                    # Approximate report date (quarter end + 1 month for filing)
                    quarter_end_month = latest['quarter'] * 3
                    report_date = datetime(latest['year'], quarter_end_month, 30)

                if report_date and report_date < observable_start:
                    status = 'not_yet_observable'
                    signals['message'] = 'No financial report available after event observable window'

            logger.info(f"Fundamentals validation completed for {symbol}: status={status}")

            return {
                'status': status,
                'symbol': symbol,
                'signals': signals,
                'validated_at': datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error validating fundamentals for {symbol}: {e}")
            return {
                'status': 'insufficient_data',
                'message': f'Error loading financial data: {str(e)}',
                'signals': {}
            }

    def save_event_snapshot(self, event_text: str, event_type: str,
                            event_date: datetime, classification_confidence: str,
                            result: Dict[str, Any]) -> Dict[str, Any]:
        """
        Persist event analysis snapshot.

        Args:
            event_text: Original event text
            event_type: Normalized event type
            event_date: Event date
            classification_confidence: Classification confidence band
            result: Analysis result JSON

        Returns:
            Dictionary with snapshot metadata
        """
        logger.info(f"Saving event snapshot for event_type={event_type}")

        # Generate snapshot ID
        snapshot_id = str(uuid.uuid4())

        # Get versions
        rules_version = "1.0.0"  # Would come from versioning system
        chain_data_version = "1.0.0"  # Would come from versioning system
        financial_data_as_of = datetime.now()

        # Create snapshot
        snapshot = {
            'snapshot_id': snapshot_id,
            'event_text': event_text,
            'normalized_event_type': event_type,
            'event_date': event_date.isoformat(),
            'classification_confidence_band': classification_confidence,
            'rules_version': rules_version,
            'chain_data_version': chain_data_version,
            'financial_data_as_of': financial_data_as_of.isoformat(),
            'result_json': result,
            'created_at': datetime.now().isoformat()
        }

        # Ensure snapshot directory exists
        self._snapshot_dir.mkdir(parents=True, exist_ok=True)

        # Save snapshot
        snapshot_file = self._snapshot_dir / f"{snapshot_id}.json"
        try:
            with open(snapshot_file, 'w', encoding='utf-8') as f:
                json.dump(snapshot, f, indent=2, ensure_ascii=False)

            logger.info(f"Saved event snapshot: {snapshot_id}")

            return {
                'snapshot_id': snapshot_id,
                'created_at': snapshot['created_at'],
                'status': 'saved'
            }

        except Exception as e:
            logger.error(f"Error saving snapshot: {e}")
            return {
                'snapshot_id': None,
                'status': 'error',
                'message': str(e)
            }

    def get_event_snapshot(self, snapshot_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve event analysis snapshot.

        Args:
            snapshot_id: Snapshot ID

        Returns:
            Snapshot dictionary or None if not found
        """
        snapshot_file = self._snapshot_dir / f"{snapshot_id}.json"

        if not snapshot_file.exists():
            return None

        try:
            with open(snapshot_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading snapshot {snapshot_id}: {e}")
            return None

    def list_event_snapshots(self, limit: int = 100) -> List[Dict[str, Any]]:
        """
        List recent event analysis snapshots.

        Args:
            limit: Maximum number of snapshots to return

        Returns:
            List of snapshot summaries
        """
        if not self._snapshot_dir.exists():
            return []

        snapshots = []
        for snapshot_file in sorted(self._snapshot_dir.glob("*.json"), reverse=True):
            if len(snapshots) >= limit:
                break

            try:
                with open(snapshot_file, 'r', encoding='utf-8') as f:
                    snapshot = json.load(f)
                    snapshots.append({
                        'snapshot_id': snapshot.get('snapshot_id'),
                        'event_type': snapshot.get('normalized_event_type'),
                        'event_date': snapshot.get('event_date'),
                        'created_at': snapshot.get('created_at')
                    })
            except Exception as e:
                logger.warning(f"Error loading snapshot {snapshot_file}: {e}")
                continue

        return snapshots


# Module-level singleton
chain_service = ChainService()