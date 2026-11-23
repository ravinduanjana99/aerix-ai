from typing import List, Optional

try:
    from ddgs import DDGS
except ImportError:
    try:
        from duckduckgo_search import DDGS
    except ImportError:
        DDGS = None

try:
    import wikipedia
except ImportError:
    wikipedia = None


def search_duckduckgo(query: str, max_results: int = 2) -> List[str]:
    """Perform real-time web search via DuckDuckGo (Free, no API key)."""
    if not DDGS:
        return []
    try:
        results = list(DDGS().text(query, max_results=max_results))
        snippets = []
        for r in results:
            title = r.get("title", "")
            body = r.get("body", "")
            if body:
                snippets.append(f"Source: {title}\nSummary: {body}")
        return snippets
    except Exception as e:
        print(f"[Search] DuckDuckGo query skipped: {e}")
        return []


def search_wikipedia(query: str) -> Optional[str]:
    """Fetch factual encyclopedic knowledge from Wikipedia (Free, no API key)."""
    if not wikipedia:
        return None
    try:
        hits = wikipedia.search(query, results=2)
        if not hits:
            return None
        page = wikipedia.page(hits[0], auto_suggest=False)
        summary = page.summary.strip()
        if summary:
            return f"Wikipedia Entry ({page.title}):\n{summary[:1200]}"
    except Exception as e:
        print(f"[Search] Wikipedia search skipped: {e}")
        return None
