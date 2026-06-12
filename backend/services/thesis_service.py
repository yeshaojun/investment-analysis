"""
Thesis service — CRUD for structured investment thesis.
"""

import logging
import uuid
from typing import Dict, List, Optional

from infra.repositories.thesis_repo import thesis_repo
from infra.repositories.catalyst_events_repo import catalyst_events_repo
from services.watchlist_service import watchlist_service

logger = logging.getLogger(__name__)


class ThesisService:

    def create(self, symbol: str, data: Dict) -> Dict:
        # Auto-add to watchlist
        watchlist_service.add(symbol)

        # Deactivate old version if exists
        old = thesis_repo.get_active(symbol)
        if old:
            thesis_repo.deactivate_all(symbol)
            # Copy future catalysts
            catalyst_events_repo.copy_future_catalysts(
                old["id"], 0, symbol  # new id will be assigned below
            )

        # Generate UUIDs for pillars
        pillars = data.get("pillars", [])
        for p in pillars:
            if not p.get("id"):
                p["id"] = str(uuid.uuid4())[:8]
            if not p.get("status"):
                p["status"] = "on_track"

        version = thesis_repo.get_next_version(symbol)
        data["symbol"] = symbol
        data["version"] = version
        data["pillars"] = pillars
        result = thesis_repo.create(data)

        # If old version existed, update catalyst thesis_id references
        if old:
            catalyst_events_repo.copy_future_catalysts(
                old["id"], result["id"], symbol
            )

        return result

    def get(self, symbol: str) -> Optional[Dict]:
        thesis = thesis_repo.get_active(symbol)
        if not thesis:
            return None
        # Attach catalysts
        catalysts = catalyst_events_repo.get_by_thesis(thesis["id"])
        thesis["catalysts"] = catalysts
        return thesis

    def list(self) -> List[Dict]:
        return thesis_repo.list_active()

    def update(self, symbol: str, data: Dict) -> Optional[Dict]:
        return thesis_repo.update(symbol, data)

    def update_pillar(self, symbol: str, pillar_uuid: str, status: str) -> Optional[Dict]:
        return thesis_repo.update_pillar_status(symbol, pillar_uuid, status)

    def add_catalyst(self, symbol: str, data: Dict) -> Optional[Dict]:
        thesis = thesis_repo.get_active(symbol)
        if not thesis:
            return None
        data["thesis_id"] = thesis["id"]
        data["symbol"] = symbol
        return catalyst_events_repo.add(data)

    def delete_catalyst(self, symbol: str, catalyst_id: int) -> bool:
        return catalyst_events_repo.delete(catalyst_id)


thesis_service = ThesisService()
