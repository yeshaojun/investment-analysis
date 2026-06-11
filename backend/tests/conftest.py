"""
Shared fixtures for all tests.
"""

import pytest

# Ensure backend root is on the path for all test modules
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


@pytest.fixture
def client():
    """Flask test client with testing mode enabled."""
    from app import app
    app.config["TESTING"] = True
    with app.test_client() as c:
        yield c
