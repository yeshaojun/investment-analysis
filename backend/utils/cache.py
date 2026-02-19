import time
import threading
import logging
from typing import Dict, Any, Optional, Callable
from functools import wraps

logger = logging.getLogger(__name__)

class CacheItem:
    def __init__(self, data: Any, ttl: int):
        self.data = data
        self.expires_at = time.time() + ttl

class SimpleCache:
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._cache: Dict[str, CacheItem] = {}
                    cls._instance._cache_lock = threading.Lock()
        return cls._instance
    
    def get(self, key: str) -> Optional[Any]:
        with self._cache_lock:
            item = self._cache.get(key)
            if item is None:
                return None
            if time.time() > item.expires_at:
                del self._cache[key]
                return None
            return item.data
    
    def set(self, key: str, value: Any, ttl: int):
        with self._cache_lock:
            self._cache[key] = CacheItem(value, ttl)
    
    def delete(self, key: str):
        with self._cache_lock:
            self._cache.pop(key, None)
    
    def clear(self):
        with self._cache_lock:
            self._cache.clear()

cache = SimpleCache()

TTL_STOCK_INFO = 300
TTL_STOCK_HISTORY = 300
TTL_FINANCIAL_DATA = 600
TTL_MARKET_DATA = 60
TTL_NEWS_DATA = 300
TTL_INDUSTRY_DATA = 300

def cached(key_prefix: str, ttl: int):
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache_key = f"{key_prefix}:{':'.join(str(a) for a in args)}:{':'.join(f'{k}={v}' for k, v in kwargs.items())}"
            
            cached_result = cache.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit: {cache_key}")
                return cached_result
            
            result = func(*args, **kwargs)
            
            if result is not None:
                cache.set(cache_key, result, ttl)
                logger.debug(f"Cache set: {cache_key}")
            
            return result
        return wrapper
    return decorator

_inflight_requests: Dict[str, threading.Event] = {}
_inflight_data: Dict[str, Any] = {}
_inflight_lock = threading.Lock()

def deduplicated(key_prefix: str):
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            request_key = f"{key_prefix}:{':'.join(str(a) for a in args)}:{':'.join(f'{k}={v}' for k, v in kwargs.items())}"
            
            with _inflight_lock:
                if request_key in _inflight_requests:
                    event = _inflight_requests[request_key]
                else:
                    event = threading.Event()
                    _inflight_requests[request_key] = event
                    event = None
            
            if event is not None:
                event.wait(timeout=30)
                with _inflight_lock:
                    return _inflight_data.get(request_key)
            
            try:
                result = func(*args, **kwargs)
                with _inflight_lock:
                    _inflight_data[request_key] = result
                return result
            finally:
                with _inflight_lock:
                    if request_key in _inflight_requests:
                        _inflight_requests[request_key].set()
                        del _inflight_requests[request_key]
                    if request_key in _inflight_data:
                        del _inflight_data[request_key]
        
        return wrapper
    return decorator
