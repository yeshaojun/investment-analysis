"""
In-process cache — thread-safe singleton with TTL.
Import TTL constants from config, not hardcoded here.
"""

import threading
import time
import logging
from typing import Any, Callable, Dict, Optional
from functools import wraps

logger = logging.getLogger(__name__)


class _CacheItem:
    __slots__ = ("data", "expires_at")

    def __init__(self, data: Any, ttl: int) -> None:
        self.data = data
        self.expires_at = time.monotonic() + ttl


class SimpleCache:
    _instance: Optional["SimpleCache"] = None
    _init_lock = threading.Lock()

    def __new__(cls) -> "SimpleCache":
        if cls._instance is None:
            with cls._init_lock:
                if cls._instance is None:
                    inst = super().__new__(cls)
                    inst._store: Dict[str, _CacheItem] = {}
                    inst._lock = threading.Lock()
                    cls._instance = inst
        return cls._instance

    def get(self, key: str) -> Optional[Any]:
        with self._lock:
            item = self._store.get(key)
            if item is None:
                return None
            if time.monotonic() > item.expires_at:
                del self._store[key]
                return None
            return item.data

    def set(self, key: str, value: Any, ttl: int) -> None:
        with self._lock:
            self._store[key] = _CacheItem(value, ttl)

    def delete(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def clear(self) -> None:
        with self._lock:
            self._store.clear()


cache = SimpleCache()


def cached(key_prefix: str, ttl: int) -> Callable:
    """Decorator: cache function return value by positional args."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            key = f"{key_prefix}:{':'.join(str(a) for a in args)}"
            result = cache.get(key)
            if result is not None:
                logger.debug("cache hit: %s", key)
                return result
            result = func(*args, **kwargs)
            if result is not None:
                cache.set(key, result, ttl)
            return result
        return wrapper
    return decorator
