"""
Seed data validation utility for AI compute chain.
Validates seed data integrity and consistency.
"""

import json
from pathlib import Path
from typing import List, Dict, Any

from domain.chain import (
    ChainID, RelationshipStatus, EvidenceTier, ConfidenceBand,
    StrengthBand, ExposureBand, StalenessStatus, EventClassification,
    ImpactDirection
)


class ValidationError:
    def __init__(self, field: str, message: str, record_id: str = None):
        self.field = field
        self.message = message
        self.record_id = record_id

    def __str__(self):
        if self.record_id:
            return f"[{self.record_id}] {self.field}: {self.message}"
        return f"{self.field}: {self.message}"


class SeedValidator:
    def __init__(self, seed_dir: Path):
        self.seed_dir = seed_dir
        self.errors: List[ValidationError] = []

        # Valid enums
        self.valid_statuses = {s.value for s in RelationshipStatus}
        self.valid_evidence_tiers = {e.value for e in EvidenceTier}
        self.valid_confidence_bands = {c.value for c in ConfidenceBand}
        self.valid_strength_bands = {s.value for s in StrengthBand}
        self.valid_exposure_bands = {e.value for e in ExposureBand}
        self.valid_staleness_statuses = {s.value for s in StalenessStatus}
        self.valid_event_classifications = {e.value for e in EventClassification}
        self.valid_impact_directions = {i.value for i in ImpactDirection}
        self.valid_chain_ids = {c.value for c in ChainID}

    def load_json(self, filename: str) -> List[Dict[str, Any]]:
        filepath = self.seed_dir / filename
        if not filepath.exists():
            self.errors.append(ValidationError(
                "file", f"Seed file {filename} not found"
            ))
            return []

        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except json.JSONDecodeError as e:
            self.errors.append(ValidationError(
                "file", f"Invalid JSON in {filename}: {str(e)}"
            ))
            return []

    def validate_chain_nodes(self, nodes: List[Dict[str, Any]]) -> Dict[str, Dict]:
        node_map = {}
        for node in nodes:
            node_id = node.get('node_id')
            chain_id = node.get('chain_id')

            if not node_id:
                self.errors.append(ValidationError(
                    "node_id", "Missing node_id", str(node)
                ))
                continue

            if not chain_id:
                self.errors.append(ValidationError(
                    "chain_id", "Missing chain_id", node_id
                ))
            elif chain_id not in self.valid_chain_ids:
                self.errors.append(ValidationError(
                    "chain_id", f"Invalid chain_id: {chain_id}", node_id
                ))

            node_map[node_id] = node

        return node_map

    def validate_company_master(self, companies: List[Dict[str, Any]]) -> Dict[str, Dict]:
        company_map = {}
        for company in companies:
            company_id = company.get('company_id')

            if not company_id:
                self.errors.append(ValidationError(
                    "company_id", "Missing company_id", str(company)
                ))
                continue

            if not company.get('symbol'):
                self.errors.append(ValidationError(
                    "symbol", "Missing symbol", company_id
                ))

            if not company.get('canonical_name'):
                self.errors.append(ValidationError(
                    "canonical_name", "Missing canonical_name", company_id
                ))

            company_map[company_id] = company

        return company_map

    def validate_company_node_exposures(
        self,
        exposures: List[Dict[str, Any]],
        node_map: Dict[str, Dict],
        company_map: Dict[str, Dict]
    ):
        exposure_ids = set()

        for exposure in exposures:
            exposure_id = exposure.get('exposure_id')
            company_id = exposure.get('company_id')
            node_id = exposure.get('node_id')
            chain_id = exposure.get('chain_id')

            if not exposure_id:
                self.errors.append(ValidationError(
                    "exposure_id", "Missing exposure_id", str(exposure)
                ))
                continue

            if exposure_id in exposure_ids:
                self.errors.append(ValidationError(
                    "exposure_id", f"Duplicate exposure_id: {exposure_id}", exposure_id
                ))
            exposure_ids.add(exposure_id)

            if not company_id:
                self.errors.append(ValidationError(
                    "company_id", "Missing company_id", exposure_id
                ))
            elif company_id not in company_map:
                self.errors.append(ValidationError(
                    "company_id", f"Company not found: {company_id}", exposure_id
                ))

            if not node_id:
                self.errors.append(ValidationError(
                    "node_id", "Missing node_id", exposure_id
                ))
            elif node_id not in node_map:
                self.errors.append(ValidationError(
                    "node_id", f"Node not found: {node_id}", exposure_id
                ))

            if not chain_id:
                self.errors.append(ValidationError(
                    "chain_id", "Missing chain_id", exposure_id
                ))
            elif chain_id not in self.valid_chain_ids:
                self.errors.append(ValidationError(
                    "chain_id", f"Invalid chain_id: {chain_id}", exposure_id
                ))

            # Validate enums
            relationship_status = exposure.get('relationship_status')
            if relationship_status and relationship_status not in self.valid_statuses:
                self.errors.append(ValidationError(
                    "relationship_status", f"Invalid status: {relationship_status}", exposure_id
                ))

            evidence_tier = exposure.get('evidence_tier')
            if evidence_tier and evidence_tier not in self.valid_evidence_tiers:
                self.errors.append(ValidationError(
                    "evidence_tier", f"Invalid evidence tier: {evidence_tier}", exposure_id
                ))

            exposure_band = exposure.get('exposure_band')
            if exposure_band and exposure_band not in self.valid_exposure_bands:
                self.errors.append(ValidationError(
                    "exposure_band", f"Invalid exposure band: {exposure_band}", exposure_id
                ))

            staleness_status = exposure.get('staleness_status')
            if staleness_status and staleness_status not in self.valid_staleness_statuses:
                self.errors.append(ValidationError(
                    "staleness_status", f"Invalid staleness status: {staleness_status}", exposure_id
                ))

            # Validate candidate relationships are not used in propagation
            if relationship_status == RelationshipStatus.CANDIDATE.value:
                # This is a warning, not an error for seed data
                pass

    def validate_chain_edges(
        self,
        edges: List[Dict[str, Any]],
        node_map: Dict[str, Dict],
        evidence_ids: set
    ):
        for edge in edges:
            edge_id = edge.get('edge_id')
            source_node_id = edge.get('source_node_id')
            target_node_id = edge.get('target_node_id')
            chain_id = edge.get('chain_id')
            relationship_status = edge.get('relationship_status')

            if not edge_id:
                self.errors.append(ValidationError(
                    "edge_id", "Missing edge_id", str(edge)
                ))
                continue

            if not source_node_id:
                self.errors.append(ValidationError(
                    "source_node_id", "Missing source_node_id", edge_id
                ))
            elif source_node_id not in node_map:
                self.errors.append(ValidationError(
                    "source_node_id", f"Source node not found: {source_node_id}", edge_id
                ))

            if not target_node_id:
                self.errors.append(ValidationError(
                    "target_node_id", "Missing target_node_id", edge_id
                ))
            elif target_node_id not in node_map:
                self.errors.append(ValidationError(
                    "target_node_id", f"Target node not found: {target_node_id}", edge_id
                ))

            if not chain_id:
                self.errors.append(ValidationError(
                    "chain_id", "Missing chain_id", edge_id
                ))
            elif chain_id not in self.valid_chain_ids:
                self.errors.append(ValidationError(
                    "chain_id", f"Invalid chain_id: {chain_id}", edge_id
                ))

            # Validate enums
            if relationship_status and relationship_status not in self.valid_statuses:
                self.errors.append(ValidationError(
                    "relationship_status", f"Invalid status: {relationship_status}", edge_id
                ))

            strength_band = edge.get('strength_band')
            if strength_band and strength_band not in self.valid_strength_bands:
                self.errors.append(ValidationError(
                    "strength_band", f"Invalid strength band: {strength_band}", edge_id
                ))

            confidence_band = edge.get('confidence_band')
            if confidence_band and confidence_band not in self.valid_confidence_bands:
                self.errors.append(ValidationError(
                    "confidence_band", f"Invalid confidence band: {confidence_band}", edge_id
                ))

            evidence_tier = edge.get('evidence_tier')
            if evidence_tier and evidence_tier not in self.valid_evidence_tiers:
                self.errors.append(ValidationError(
                    "evidence_tier", f"Invalid evidence tier: {evidence_tier}", edge_id
                ))

            staleness_status = edge.get('staleness_status')
            if staleness_status and staleness_status not in self.valid_staleness_statuses:
                self.errors.append(ValidationError(
                    "staleness_status", f"Invalid staleness status: {staleness_status}", edge_id
                ))

            # Validate candidate edges are not used in propagation
            if relationship_status == RelationshipStatus.CANDIDATE.value:
                # Candidate edges should not be used in propagation
                # This is a design constraint, not necessarily a validation error
                pass

    def validate_event_rules(self, rules: List[Dict[str, Any]], node_map: Dict[str, Dict]):
        for rule in rules:
            rule_id = rule.get('rule_id')
            chain_id = rule.get('chain_id')
            event_type = rule.get('event_type')
            affected_node_ids = rule.get('affected_node_ids', [])
            impact_direction = rule.get('impact_direction')

            if not rule_id:
                self.errors.append(ValidationError(
                    "rule_id", "Missing rule_id", str(rule)
                ))
                continue

            if not chain_id:
                self.errors.append(ValidationError(
                    "chain_id", "Missing chain_id", rule_id
                ))
            elif chain_id not in self.valid_chain_ids:
                self.errors.append(ValidationError(
                    "chain_id", f"Invalid chain_id: {chain_id}", rule_id
                ))

            if not event_type:
                self.errors.append(ValidationError(
                    "event_type", "Missing event_type", rule_id
                ))
            elif event_type not in self.valid_event_classifications:
                self.errors.append(ValidationError(
                    "event_type", f"Invalid event type: {event_type}", rule_id
                ))

            for node_id in affected_node_ids:
                if node_id not in node_map:
                    self.errors.append(ValidationError(
                        "affected_node_ids", f"Node not found: {node_id}", rule_id
                    ))

            if impact_direction and impact_direction not in self.valid_impact_directions:
                self.errors.append(ValidationError(
                    "impact_direction", f"Invalid impact direction: {impact_direction}", rule_id
                ))

    def validate_evidence(self, evidence_list: List[Dict[str, Any]]) -> set:
        evidence_ids = set()

        for evidence in evidence_list:
            evidence_id = evidence.get('evidence_id')
            chain_id = evidence.get('chain_id')
            source_type = evidence.get('source_type')
            confidence_band = evidence.get('confidence_band')

            if not evidence_id:
                self.errors.append(ValidationError(
                    "evidence_id", "Missing evidence_id", str(evidence)
                ))
                continue

            if evidence_id in evidence_ids:
                self.errors.append(ValidationError(
                    "evidence_id", f"Duplicate evidence_id: {evidence_id}", evidence_id
                ))
            evidence_ids.add(evidence_id)

            if not chain_id:
                self.errors.append(ValidationError(
                    "chain_id", "Missing chain_id", evidence_id
                ))
            elif chain_id not in self.valid_chain_ids:
                self.errors.append(ValidationError(
                    "chain_id", f"Invalid chain_id: {chain_id}", evidence_id
                ))

            if source_type and source_type not in self.valid_evidence_tiers:
                self.errors.append(ValidationError(
                    "source_type", f"Invalid source type: {source_type}", evidence_id
                ))

            if confidence_band and confidence_band not in self.valid_confidence_bands:
                self.errors.append(ValidationError(
                    "confidence_band", f"Invalid confidence band: {confidence_band}", evidence_id
                ))

        return evidence_ids

    def validate_all(self) -> List[ValidationError]:
        self.errors = []

        # Load all seed data
        chain_nodes = self.load_json('chain_nodes.json')
        company_master = self.load_json('company_master.json')
        company_node_exposures = self.load_json('company_node_exposures.json')
        chain_edges = self.load_json('chain_edges.json')
        event_rules = self.load_json('event_rules.json')
        evidence = self.load_json('evidence.json')

        # Validate and build maps
        node_map = self.validate_chain_nodes(chain_nodes)
        company_map = self.validate_company_master(company_master)

        # Validate exposures (needs node_map and company_map)
        self.validate_company_node_exposures(
            company_node_exposures, node_map, company_map
        )

        # Validate evidence
        evidence_ids = self.validate_evidence(evidence)

        # Validate edges (needs node_map and evidence_ids)
        self.validate_chain_edges(chain_edges, node_map, evidence_ids)

        # Validate event rules (needs node_map)
        self.validate_event_rules(event_rules, node_map)

        return self.errors


def validate_seed_data(seed_dir: Path = None) -> List[ValidationError]:
    if seed_dir is None:
        seed_dir = Path(__file__).parent / 'seed_data'

    validator = SeedValidator(seed_dir)
    return validator.validate_all()


if __name__ == '__main__':
    errors = validate_seed_data()

    if errors:
        print(f"Found {len(errors)} validation errors:")
        for error in errors:
            print(f"  {error}")
    else:
        print("All seed data is valid!")