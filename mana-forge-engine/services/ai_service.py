import os
import json
import random
import logging
from typing import List, Optional
from groq import Groq
from pydantic import ValidationError
from schemas.deck_schemas import SideboardResponse, CardInput, DeckAnalysisResponse, RandomDeckResponse
from prompts.sideboard_prompts import get_sideboard_system_prompt, get_sideboard_user_prompt
from prompts.analysis_prompts import get_analysis_system_prompt, get_analysis_user_prompt
from prompts.random_deck_prompts import get_random_deck_system_prompt, get_random_deck_user_prompt
from prompts.format_context import get_tier1_archetypes, get_deck_size

logger = logging.getLogger(__name__)

PREMODERN_META = [
    "Burn", "Stiflenought", "Goblins", "Oath", "Parallax Replenish",
    "Enchantress", "Elves", "Devourer Combo", "Landstill", "Tide Control",
    "Madness", "Survival", "Terrageddon", "Stasis", "Reanimator"
]


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


class AIService:
    def __init__(self):
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            logger.error("GROQ_API_KEY not found in environment variables")
            self.client = None
        else:
            self.client = Groq(api_key=api_key)
        self.model = "llama-3.3-70b-versatile"

    def _ensure_client(self):
        if not self.client:
            raise RuntimeError("Groq client is not initialized. Check GROQ_API_KEY.")

    def suggest_sideboard(self, main_deck: list[CardInput], format_name: str, locale: str) -> SideboardResponse:
        self._ensure_client()
        deck_str = "\n".join([f"{c.quantity} {c.name}" for c in main_deck])
        system_prompt = get_sideboard_system_prompt()
        user_prompt = get_sideboard_user_prompt(deck_str, format_name, locale)

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=self.model,
                temperature=0.5,
                response_format={"type": "json_object"},
            )
            content = chat_completion.choices[0].message.content
            logger.debug("Sideboard raw response (first 500): %s", content[:500])
            return _parse_ai_response(content, SideboardResponse)
        except (ValueError, RuntimeError):
            raise
        except Exception as e:
            logger.error("Error calling Groq API (sideboard): %s", str(e))
            raise

    def analyze_deck(self, main_deck: list[CardInput], sideboard: list[CardInput], format_name: str, locale: str, meta_archetypes: Optional[List[str]] = None) -> DeckAnalysisResponse:
        self._ensure_client()
        main_str = "\n".join([f"{c.quantity} {c.name}" for c in main_deck])
        side_str = "\n".join([f"{c.quantity} {c.name}" for c in sideboard]) if sideboard else "No Sideboard provided."

        target_archetypes = meta_archetypes
        if not target_archetypes and format_name.lower() == "premodern":
            target_archetypes = PREMODERN_META

        system_prompt = get_analysis_system_prompt()
        user_prompt = get_analysis_user_prompt(main_str, side_str, format_name, locale, target_archetypes)

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=self.model,
                temperature=0.5,
                response_format={"type": "json_object"},
            )
            content = chat_completion.choices[0].message.content
            logger.debug("Analysis raw response (first 500): %s", content[:500])
            return _parse_ai_response(content, DeckAnalysisResponse)
        except (ValueError, RuntimeError):
            raise
        except Exception as e:
            logger.error("Error calling Groq API (analysis): %s", str(e))
            raise

    def generate_random_deck(self, locale: str, format_name: Optional[str] = None) -> RandomDeckResponse:
        self._ensure_client()

        # Pick a random archetype from the format's tier list to force variety
        tier1 = get_tier1_archetypes(format_name)
        archetype_hint = random.choice(tier1) if tier1 else None
        min_size = get_deck_size(format_name)

        logger.info("Random deck request — format: %s locale: %s archetype_hint: %s",
                    format_name or "any", locale, archetype_hint or "none")

        system_prompt = get_random_deck_system_prompt()

        for attempt in range(1, 3):  # up to 2 attempts
            user_prompt = get_random_deck_user_prompt(locale, format_name, archetype_hint)
            try:
                chat_completion = self.client.chat.completions.create(
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    model=self.model,
                    temperature=0.7,
                    response_format={"type": "json_object"},
                )
                content = chat_completion.choices[0].message.content
                logger.debug("Random deck attempt %d raw response (first 500): %s", attempt, content[:500])
                result = _parse_ai_response(content, RandomDeckResponse)

                actual_size = sum(c.quantity for c in result.main_deck)
                if actual_size < min_size:
                    logger.warning(
                        "Attempt %d: deck has %d/%d cards. %s",
                        attempt, actual_size, min_size,
                        "Retrying..." if attempt < 2 else "Returning incomplete deck."
                    )
                    if attempt < 2:
                        continue  # retry once
                else:
                    logger.info("Random deck generated: %d cards, archetype=%s", actual_size, result.archetype)

                return result
            except (ValueError, RuntimeError):
                raise
            except Exception as e:
                logger.error("Error calling Groq API (random deck attempt %d): %s", attempt, str(e))
                raise
