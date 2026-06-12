"""
Prompt loader — load and render markdown prompt templates.
"""

import os
import logging
from typing import Dict

import config

logger = logging.getLogger(__name__)


class PromptLoader:
    """Load prompt templates from backend/prompts/ at startup."""

    def __init__(self, prompts_dir: str = None) -> None:
        self._dir = prompts_dir or os.path.join(config.BACKEND_DIR, "prompts")
        self._templates: Dict[str, str] = {}
        self._load_all()

    def _load_all(self) -> None:
        if not os.path.isdir(self._dir):
            raise FileNotFoundError(f"Prompts directory not found: {self._dir}")
        for fname in os.listdir(self._dir):
            if fname.endswith(".md"):
                key = fname[:-3]
                path = os.path.join(self._dir, fname)
                with open(path, "r", encoding="utf-8") as f:
                    self._templates[key] = f.read()
        logger.info("PromptLoader loaded %d templates from %s", len(self._templates), self._dir)

    def render(self, template: str, **kwargs) -> str:
        if template not in self._templates:
            raise KeyError(f"Prompt template '{template}' not found")
        return self._templates[template].format_map(kwargs)


prompt_loader = PromptLoader()
