"""
AI provider — LLM API calls and web search.
Services never call httpx / LLM SDKs directly.
"""

import logging
import time
from typing import Dict, List

import httpx
from bs4 import BeautifulSoup

import config

logger = logging.getLogger(__name__)

_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
}


class AIProvider:

    def __init__(self) -> None:
        self._custom_key = config.AI_API_KEY
        self._custom_url = config.AI_BASE_URL
        self._custom_model = config.AI_MODEL_NAME
        self._deepseek_key = config.DEEPSEEK_API_KEY
        self._deepseek_url = config.DEEPSEEK_BASE_URL
        self._deepseek_model = config.DEEPSEEK_MODEL
        self._qwen_key = config.QWEN_API_KEY
        self._qwen_url = config.QWEN_BASE_URL
        self._qwen_model = config.QWEN_MODEL
        self._timeout = config.AI_TIMEOUT
        self._max_tokens = config.AI_MAX_TOKENS
        self._temperature = config.AI_TEMPERATURE

    async def call_llm(self, messages: List[Dict], provider: str = "") -> str:
        provider = (provider or config.AI_DEFAULT_PROVIDER).lower()
        logger.info("llm call start provider=%s messages=%d", provider, len(messages))
        started = time.perf_counter()
        if provider == "qwen":
            result = await self._call_qwen(messages)
        elif provider in {"custom", "openai", "openai-compatible"}:
            result = await self._call_custom(messages)
        else:
            result = await self._call_deepseek(messages)
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info("llm call done provider=%s chars=%d elapsed_ms=%d", provider, len(result), elapsed_ms)
        return result

    async def _call_deepseek(self, messages: List[Dict]) -> str:
        return await self._call_openai_compatible(
            messages=messages,
            provider="deepseek",
            api_key=self._deepseek_key,
            base_url=self._deepseek_url,
            model=self._deepseek_model,
        )

    async def _call_qwen(self, messages: List[Dict]) -> str:
        return await self._call_openai_compatible(
            messages=messages,
            provider="qwen",
            api_key=self._qwen_key,
            base_url=self._qwen_url,
            model=self._qwen_model,
        )

    async def _call_custom(self, messages: List[Dict]) -> str:
        return await self._call_openai_compatible(
            messages=messages,
            provider="custom",
            api_key=self._custom_key,
            base_url=self._custom_url,
            model=self._custom_model,
        )

    async def _call_openai_compatible(
        self,
        messages: List[Dict],
        provider: str,
        api_key: str,
        base_url: str,
        model: str,
    ) -> str:
        if not api_key:
            raise ValueError(f"{provider} API key not configured")
        if not base_url:
            raise ValueError(f"{provider} base URL not configured")
        if not model:
            raise ValueError(f"{provider} model name not configured")
        logger.info("%s request start model=%s base_url=%s", provider, model, base_url)
        async with httpx.AsyncClient(timeout=self._timeout) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": self._temperature,
                    "max_tokens": self._max_tokens,
                },
            )
        if resp.status_code != 200:
            raise RuntimeError(f"{provider} API error {resp.status_code}: {resp.text}")
        return resp.json()["choices"][0]["message"]["content"]

    async def search_web(self, query: str, max_results: int = 5) -> List[Dict]:
        started = time.perf_counter()
        logger.info("web search start query=%s max_results=%d", query, max_results)
        try:
            async with httpx.AsyncClient(timeout=self._timeout, follow_redirects=True) as client:
                resp = await client.get(
                    "https://www.baidu.com/s",
                    params={"wd": query, "rn": max_results},
                    headers={**_HEADERS, "Accept": "text/html,application/xhtml+xml,*/*;q=0.8"},
                )
                resp.encoding = "utf-8"
            soup = BeautifulSoup(resp.text, "html.parser")
            results = []
            for item in soup.select(".result")[:max_results]:
                title_elem = item.select_one("h3 a")
                snippet_elem = item.select_one(".c-abstract") or item.select_one(".c-span9")
                if title_elem:
                    results.append({
                        "title": title_elem.get_text(strip=True),
                        "link": title_elem.get("href", ""),
                        "snippet": snippet_elem.get_text(strip=True) if snippet_elem else "",
                    })
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            logger.info("web search done query=%s results=%d elapsed_ms=%d", query, len(results), elapsed_ms)
            return results or [{"title": query, "link": "", "snippet": ""}]
        except Exception as exc:
            elapsed_ms = int((time.perf_counter() - started) * 1000)
            logger.warning("web search failed query=%s elapsed_ms=%d error=%s", query, elapsed_ms, exc)
            return [{"title": query, "link": "", "snippet": ""}]

    async def fetch_page(self, url: str) -> str:
        try:
            async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
                resp = await client.get(url, headers=_HEADERS)
            soup = BeautifulSoup(resp.text, "html.parser")
            for tag in soup(["script", "style", "nav", "footer", "header"]):
                tag.decompose()
            lines = [ln.strip() for ln in soup.get_text(separator="\n", strip=True).splitlines() if ln.strip()]
            return "\n".join(lines[:200])
        except Exception as exc:
            logger.warning("fetch_page %s: %s", url, exc)
            return ""

    async def search_and_collect(self, query: str, max_pages: int = 3) -> str:
        started = time.perf_counter()
        results = await self.search_web(query, max_results=max_pages)
        parts = []
        for r in results:
            if r.get("link"):
                content = await self.fetch_page(r["link"])
                if content:
                    parts.append(f"【来源: {r['title']}】\n{content[:2000]}")
            elif r.get("snippet"):
                parts.append(f"【{r['title']}】\n{r['snippet']}")
        collected = "\n\n".join(parts) if parts else f"关于「{query}」的信息，请根据专业知识分析。"
        elapsed_ms = int((time.perf_counter() - started) * 1000)
        logger.info("web collect done query=%s chars=%d elapsed_ms=%d", query, len(collected), elapsed_ms)
        return collected


ai_provider = AIProvider()
