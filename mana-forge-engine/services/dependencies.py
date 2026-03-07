"""Shared FastAPI dependencies."""
from functools import lru_cache
from services.ai_service import AIService


@lru_cache(maxsize=1)
def get_ai_service() -> AIService:
    return AIService()
