import os
import json
import random
import logging
from typing import List, Optional
from groq import AsyncGroq, RateLimitError
from pydantic import ValidationError
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from schemas.deck_schemas import SideboardResponse, CardInput, DeckAnalysisResponse, RandomDeckResponse, ManaBaseAnalysisResponse
from prompts.sideboard_prompts import get_sideboard_system_prompt, get_sideboard_user_prompt
from prompts.analysis_prompts import get_analysis_system_prompt, get_analysis_user_prompt
from prompts.random_deck_prompts import get_random_deck_system_prompt, get_random_deck_user_prompt
from prompts.deck_review_prompts import get_deck_review_system_prompt, get_deck_review_user_prompt
from prompts.mana_base_prompts import get_mana_base_system_prompt, get_mana_base_user_prompt
from prompts.format_context import get_tier1_archetypes, get_deck_size, requires_sideboard, is_singleton

logger = logging.getLogger(__name__)

_GROQ_TIMEOUT = 60.0  # seconds per API call


def _parse_ai_response(content: str, schema_class):
    """Parse and validate AI JSON response. Raises ValueError with details on failure."""
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        logger.error("AI returned invalid JSON: %s | Raw (first 500): %s", e, content[:500])
        raise ValueError(f"AI returned malformed JSON: {e}") from e
    try:
        return schema_class(**data)
    except ValidationError as e:
        logger.error("AI response failed schema validation: %s | Data: %s", e, str(data)[:500])
        raise ValueError(f"AI response does not match expected schema: {e}") from e


def _groq_retry(func):
    """Decorator: retry up to 3 times with exponential backoff on Groq rate limit errors."""
    return retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=20),
        retry=retry_if_exception_type(RateLimitError),
        reraise=True,
    )(func)


class AIService:
    def __init__(self):
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            logger.error("GROQ_API_KEY not found in environment variables")
            self.client = None
        else:
            self.client = AsyncGroq(api_key=api_key)
        self.model = "llama-3.3-70b-versatile"

    def _ensure_client(self):
        if not self.client:
            raise RuntimeError("Groq client is not initialized. Check GROQ_API_KEY.")

    @_groq_retry
    async def _call_groq(self, messages: list, temperature: float) -> str:
        """Single async Groq call with timeout. Returns raw content string."""
        chat_completion = await self.client.chat.completions.create(
            messages=messages,
            model=self.model,
            temperature=temperature,
            response_format={"type": "json_object"},
            timeout=_GROQ_TIMEOUT,
        )
        return chat_completion.choices[0].message.content

    async def suggest_sideboard(self, main_deck: list[CardInput], format_name: str, locale: str) -> SideboardResponse:
        self._ensure_client()
        deck_str = "\n".join([f"{c.quantity} {c.name}" for c in main_deck])
        messages = [
            {"role": "system", "content": get_sideboard_system_prompt()},
            {"role": "user",   "content": get_sideboard_user_prompt(deck_str, format_name, locale)},
        ]
        try:
            content = await self._call_groq(messages, temperature=0.5)
            logger.debug("Sideboard raw response (first 500): %s", content[:500])
            return _parse_ai_response(content, SideboardResponse)
        except (ValueError, RuntimeError):
            raise
        except Exception as e:
            logger.error("Error calling Groq API (sideboard): %s", str(e))
            raise

    async def analyze_deck(
        self,
        main_deck: list[CardInput],
        sideboard: list[CardInput],
        format_name: str,
        locale: str,
        meta_archetypes: Optional[List[str]] = None,
    ) -> DeckAnalysisResponse:
        self._ensure_client()
        main_str = "\n".join([f"{c.quantity} {c.name}" for c in main_deck])
        side_str = "\n".join([f"{c.quantity} {c.name}" for c in sideboard]) if sideboard else "No Sideboard provided."

        target_archetypes = meta_archetypes or get_tier1_archetypes(format_name) or None

        messages = [
            {"role": "system", "content": get_analysis_system_prompt()},
            {"role": "user",   "content": get_analysis_user_prompt(main_str, side_str, format_name, locale, target_archetypes)},
        ]
        try:
            content = await self._call_groq(messages, temperature=0.5)
            logger.debug("Analysis raw response (first 500): %s", content[:500])
            return _parse_ai_response(content, DeckAnalysisResponse)
        except (ValueError, RuntimeError):
            raise
        except Exception as e:
            logger.error("Error calling Groq API (analysis): %s", str(e))
            raise

    async def _review_and_fix_deck(self, deck: RandomDeckResponse, format_name: Optional[str], locale: str) -> RandomDeckResponse:
        """Second AI pass: validates card count, mana base, and strategy coherence."""
        deck_size = get_deck_size(format_name)
        needs_side = requires_sideboard(format_name)
        singleton = is_singleton(format_name)

        deck_json = {
            "deck_name": deck.deck_name,
            "format_name": deck.format_name,
            "archetype": deck.archetype,
            "strategy_summary": deck.strategy_summary,
            "brief_analysis": deck.brief_analysis,
            "main_deck": [{"name": c.name, "quantity": c.quantity} for c in deck.main_deck],
            "sideboard": [{"name": c.name, "quantity": c.quantity} for c in deck.sideboard],
        }
        messages = [
            {"role": "system", "content": get_deck_review_system_prompt()},
            {"role": "user",   "content": get_deck_review_user_prompt(deck_json, format_name, deck_size, needs_side, singleton, locale)},
        ]
        try:
            content = await self._call_groq(messages, temperature=0.3)
            logger.debug("Deck review raw response (first 500): %s", content[:500])
            reviewed = _parse_ai_response(content, RandomDeckResponse)
            actual_size = sum(c.quantity for c in reviewed.main_deck)
            logger.info("Deck review complete: %d cards after review (target %d)", actual_size, deck_size)
            return reviewed
        except Exception as e:
            logger.warning("Deck review pass failed (%s); returning original deck.", str(e))
            return deck

    async def generate_random_deck(self, locale: str, format_name: Optional[str] = None) -> RandomDeckResponse:
        self._ensure_client()

        tier1 = get_tier1_archetypes(format_name)
        archetype_hint = random.choice(tier1) if tier1 else None
        min_size = get_deck_size(format_name)

        logger.info("Random deck request — format: %s locale: %s archetype_hint: %s",
                    format_name or "any", locale, archetype_hint or "none")

        system_prompt = get_random_deck_system_prompt()

        for attempt in range(1, 3):  # up to 2 attempts
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user",   "content": get_random_deck_user_prompt(locale, format_name, archetype_hint)},
            ]
            try:
                content = await self._call_groq(messages, temperature=0.7)
                logger.debug("Random deck attempt %d raw response (first 500): %s", attempt, content[:500])
                result = _parse_ai_response(content, RandomDeckResponse)

                actual_size = sum(c.quantity for c in result.main_deck)
                if actual_size < min_size:
                    logger.warning(
                        "Attempt %d: deck has %d/%d cards. %s",
                        attempt, actual_size, min_size,
                        "Retrying..." if attempt < 2 else "Returning incomplete deck.",
                    )
                    if attempt < 2:
                        continue
                else:
                    logger.info("Random deck generated: %d cards, archetype=%s", actual_size, result.archetype)

                return await self._review_and_fix_deck(result, format_name, locale)
            except (ValueError, RuntimeError):
                raise
            except Exception as e:
                logger.error("Error calling Groq API (random deck attempt %d): %s", attempt, str(e))
                raise

    async def get_mana_base_recommendations(
        self,
        main_deck: list[CardInput],
        format_name: str,
        locale: str,
        target_level: str = "competitive"
    ) -> ManaBaseAnalysisResponse:
        self._ensure_client()
        deck_str = "\n".join([f"{c.quantity} {c.name}" for c in main_deck])
        messages = [
            {"role": "system", "content": get_mana_base_system_prompt()},
            {"role": "user",   "content": get_mana_base_user_prompt(deck_str, format_name, locale, target_level)},
        ]
        try:
            content = await self._call_groq(messages, temperature=0.4)
            logger.debug("Mana base raw response (first 500): %s", content[:500])
            return _parse_ai_response(content, ManaBaseAnalysisResponse)
        except (ValueError, RuntimeError):
            raise
        except Exception as e:
            logger.error("Error calling Groq API (mana base): %s", str(e))
            raise
