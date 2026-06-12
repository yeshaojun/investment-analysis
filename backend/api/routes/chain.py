"""
Chain routes — /api/chains/*, /api/stock/<symbol>/chain-position, /api/events/*
Route functions only: validate params, call service, return response.
"""

import logging
from datetime import datetime

from flask import Blueprint, request

from services.chain_service import chain_service
from api.response import (
    bad_request_response,
    error_response,
    not_found_response,
    success_response,
)

logger = logging.getLogger(__name__)
chain_bp = Blueprint("chain", __name__)


@chain_bp.route("/api/chains/ai-compute", methods=["GET"])
def get_ai_compute_chain():
    """Get AI compute chain overview."""
    try:
        chain_id = request.args.get("chain_id", "ai-compute")
        data = chain_service.get_chain_overview(chain_id)
        return success_response(data=data)
    except Exception as exc:
        logger.error("get_ai_compute_chain: %s", exc)
        return error_response(str(exc))


@chain_bp.route("/api/stock/<symbol>/chain-position", methods=["GET"])
def get_stock_chain_position(symbol: str):
    """Get company's position in the AI compute chain."""
    try:
        data = chain_service.get_company_chain_position(symbol=symbol)

        if data.get('status') == 'unmapped':
            return not_found_response(data.get('message', 'Company not found'))

        return success_response(data=data)
    except Exception as exc:
        logger.error("get_stock_chain_position %s: %s", symbol, exc)
        return error_response(str(exc))


@chain_bp.route("/api/events/analyze-impact", methods=["POST"])
def analyze_event_impact():
    """Analyze event impact on AI compute chain."""
    try:
        body = request.get_json()

        if not body:
            return bad_request_response("Request body is required")

        event_text = body.get('event_text')
        if not event_text:
            return bad_request_response("event_text is required")

        # Parse event date
        event_date_str = body.get('event_date')
        event_date = None
        if event_date_str:
            try:
                event_date = datetime.fromisoformat(event_date_str)
            except ValueError:
                return bad_request_response("Invalid event_date format. Use ISO format.")

        # Classify event
        classification = chain_service.classify_event(event_text)
        event_type = classification.get('event_type')

        if event_type == 'manual_required':
            return success_response(data={
                'classification': classification,
                'impact': None,
                'message': 'Event type requires manual classification'
            })

        # Propagate impact
        impact = chain_service.propagate_event_impact(event_type, event_date)

        # Validate fundamentals for affected companies
        affected_companies = {}
        for node in impact.get('affected_nodes', []):
            for company in node.get('exposed_companies', []):
                symbol = company.get('symbol')
                if symbol and symbol not in affected_companies:
                    validation = chain_service.validate_fundamentals(
                        symbol, event_date,
                        impact.get('impact_paths', [{}])[0].get('time_lag_days')
                    )
                    affected_companies[symbol] = validation

        # Save snapshot
        snapshot_result = chain_service.save_event_snapshot(
            event_text=event_text,
            event_type=event_type,
            event_date=event_date or datetime.now(),
            classification_confidence=classification.get('confidence_band'),
            result={
                'classification': classification,
                'impact': impact,
                'fundamental_validation': affected_companies
            }
        )

        return success_response(data={
            'classification': classification,
            'impact': impact,
            'fundamental_validation': affected_companies,
            'snapshot': snapshot_result
        })

    except Exception as exc:
        logger.error("analyze_event_impact: %s", exc)
        return error_response(str(exc))


@chain_bp.route("/api/events/snapshots/<snapshot_id>", methods=["GET"])
def get_event_snapshot(snapshot_id: str):
    """Get event analysis snapshot by ID."""
    try:
        snapshot = chain_service.get_event_snapshot(snapshot_id)

        if not snapshot:
            return not_found_response(f"Snapshot not found: {snapshot_id}")

        return success_response(data=snapshot)
    except Exception as exc:
        logger.error("get_event_snapshot %s: %s", snapshot_id, exc)
        return error_response(str(exc))


@chain_bp.route("/api/events/snapshots", methods=["GET"])
def list_event_snapshots():
    """List recent event analysis snapshots."""
    try:
        limit = request.args.get("limit", 100, type=int)
        snapshots = chain_service.list_event_snapshots(limit)
        return success_response(data=snapshots)
    except Exception as exc:
        logger.error("list_event_snapshots: %s", exc)
        return error_response(str(exc))


@chain_bp.route("/api/chains/<chain_id>/rules", methods=["GET"])
def get_chain_rules(chain_id: str):
    """Get event rules for a chain."""
    try:
        event_type = request.args.get("event_type")
        rules = chain_service.get_event_rules(event_type)
        return success_response(data=rules)
    except Exception as exc:
        logger.error("get_chain_rules %s: %s", chain_id, exc)
        return error_response(str(exc))