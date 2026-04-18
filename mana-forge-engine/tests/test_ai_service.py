"""Tests for AIService — Groq client is mocked; no real API calls."""
import json
import pytest
from unittest.mock import AsyncMock, patch

from services.ai_service import AIService, _parse_ai_response
from schemas.deck_schemas import (
    CardInput,
    SideboardResponse,
    DeckAnalysisResponse,
    RandomDeckResponse,
    CardOutput,
)


# ---------------------------------------------------------------------------
# _parse_ai_response (module-level pure helper)
# ---------------------------------------------------------------------------

VALID_SIDEBOARD_JSON = json.dumps({
    "suggestions": [{"name": "Tormod's Crypt", "quantity": 2, "reason": "Anti-reanimator"}],
    "analysis": "Good choices.",
})

VALID_ANALYSIS_JSON = json.dumps({
    "mana_curve_analysis": "Low curve.",
    "strengths": ["Fast"],
    "weaknesses": ["Weak late game"],
    "matchups": [
        {
            "archetype": "The Rock",
            "win_rate_pre": 0.6,
            "win_rate_post": 0.55,
            "key_cards_opponent": ["Pernicious Deed"],
            "strategy": "Race them.",
            "sideboard_in": [],
            "sideboard_out": [],
        }
    ],
    "suggested_changes": [],
    "general_summary": "Solid aggro.",
    "scores": {
        "speed":           {"value": 9, "key_cards": ["Jackal Pup"]},
        "consistency":     {"value": 7, "key_cards": ["Cursed Scroll"]},
        "aggression":      {"value": 10, "key_cards": ["Ball Lightning"]},
        "resilience":      {"value": 3, "key_cards": []},
        "interaction":     {"value": 4, "key_cards": ["Incinerate"]},
        "combo_potential": {"value": 2, "key_cards": []},
    },
    "projected_scores": {
        "speed":           {"value": 9, "key_cards": ["Jackal Pup"]},
        "consistency":     {"value": 8, "key_cards": ["Cursed Scroll"]},
        "aggression":      {"value": 10, "key_cards": ["Ball Lightning"]},
        "resilience":      {"value": 3, "key_cards": []},
        "interaction":     {"value": 4, "key_cards": ["Incinerate"]},
        "combo_potential": {"value": 2, "key_cards": []},
    },
})

VALID_RANDOM_DECK_JSON = json.dumps({
    "deck_name": "Sligh",
    "format_name": "premodern",
    "archetype": "Burn",
    "strategy_summary": "Fast mono-red.",
    "brief_analysis": "Classic Sligh.",
    "main_deck": [
        {"name": "Mountain", "quantity": 20},
        {"name": "Lightning Bolt", "quantity": 4},
        {"name": "Jackal Pup", "quantity": 4},
        {"name": "Mogg Fanatic", "quantity": 4},
        {"name": "Grim Lavamancer", "quantity": 4},
        {"name": "Fireblast", "quantity": 4},
        {"name": "Incinerate", "quantity": 4},
        {"name": "Ball Lightning", "quantity": 4},
        {"name": "Price of Progress", "quantity": 4},
        {"name": "Cursed Scroll", "quantity": 4},
        {"name": "Wasteland", "quantity": 4},
    ],
    "sideboard": [
        {"name": "Pyroblast", "quantity": 4},
        {"name": "Tormod's Crypt", "quantity": 3},
        {"name": "Shattering Pulse", "quantity": 4},
        {"name": "Sulfuric Vortex", "quantity": 4},
    ],
})


class TestParseAiResponse:
    def test_valid_json_returns_schema_instance(self):
        result = _parse_ai_response(VALID_SIDEBOARD_JSON, SideboardResponse)
        assert isinstance(result, SideboardResponse)
        assert len(result.suggestions) == 1
        assert result.suggestions[0].name == "Tormod's Crypt"

    def test_invalid_json_raises_value_error(self):
        with pytest.raises(ValueError, match="malformed JSON"):
            _parse_ai_response("this is not json", SideboardResponse)

    def test_wrong_schema_raises_value_error(self):
        wrong = json.dumps({"unexpected_key": "value"})
        with pytest.raises(ValueError, match="does not match expected schema"):
            _parse_ai_response(wrong, SideboardResponse)

    def test_partial_json_raises_value_error(self):
        partial = json.dumps({"analysis": "ok"})  # missing 'suggestions'
        with pytest.raises(ValueError, match="does not match expected schema"):
            _parse_ai_response(partial, SideboardResponse)

    def test_analysis_response_parsed_correctly(self):
        result = _parse_ai_response(VALID_ANALYSIS_JSON, DeckAnalysisResponse)
        assert isinstance(result, DeckAnalysisResponse)
        assert result.matchups[0].archetype == "The Rock"

    def test_random_deck_response_parsed_correctly(self):
        result = _parse_ai_response(VALID_RANDOM_DECK_JSON, RandomDeckResponse)
        assert isinstance(result, RandomDeckResponse)
        assert result.deck_name == "Sligh"


# ---------------------------------------------------------------------------
# AIService initialisation
# ---------------------------------------------------------------------------

class TestAIServiceInit:
    def test_no_api_key_sets_client_to_none(self, monkeypatch):
        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        service = AIService()
        assert service.client is None

    def test_ensure_client_raises_when_client_none(self, monkeypatch):
        monkeypatch.delenv("GROQ_API_KEY", raising=False)
        service = AIService()
        with pytest.raises(RuntimeError, match="Groq client is not initialized"):
            service._ensure_client()

    def test_api_key_present_sets_client(self, monkeypatch):
        monkeypatch.setenv("GROQ_API_KEY", "test-key-123")
        service = AIService()
        assert service.client is not None


# ---------------------------------------------------------------------------
# AIService async methods (Groq mocked via _call_groq)
# ---------------------------------------------------------------------------

def _make_service() -> AIService:
    """Return an AIService with a non-None client (key not needed for mocked tests)."""
    svc = AIService.__new__(AIService)
    svc.client = object()  # truthy sentinel — _ensure_client won't raise
    svc.model = "llama-3.3-70b-versatile"
    return svc


MAIN_DECK = [CardInput(card_name="Lightning Bolt", quantity=4), CardInput(card_name="Mountain", quantity=20)]
SIDE_DECK = [CardInput(card_name="Pyroblast", quantity=4)]


class TestSuggestSideboard:
    async def test_returns_sideboard_response(self):
        svc = _make_service()
        svc._call_groq = AsyncMock(return_value=VALID_SIDEBOARD_JSON)

        result = await svc.suggest_sideboard(MAIN_DECK, "premodern", "en")

        assert isinstance(result, SideboardResponse)
        svc._call_groq.assert_called_once()

    async def test_propagates_value_error_from_parse(self):
        svc = _make_service()
        svc._call_groq = AsyncMock(return_value="not json")

        with pytest.raises(ValueError):
            await svc.suggest_sideboard(MAIN_DECK, "premodern", "en")

    async def test_propagates_runtime_error(self):
        svc = _make_service()
        svc._call_groq = AsyncMock(side_effect=RuntimeError("boom"))

        with pytest.raises(RuntimeError):
            await svc.suggest_sideboard(MAIN_DECK, "premodern", "en")


class TestAnalyzeDeck:
    async def test_returns_analysis_response(self):
        svc = _make_service()
        svc._call_groq = AsyncMock(return_value=VALID_ANALYSIS_JSON)

        result = await svc.analyze_deck(MAIN_DECK, SIDE_DECK, "premodern", "en")

        assert isinstance(result, DeckAnalysisResponse)
        assert result.general_summary == "Solid aggro."

    async def test_uses_provided_meta_archetypes(self):
        svc = _make_service()
        svc._call_groq = AsyncMock(return_value=VALID_ANALYSIS_JSON)
        custom_meta = ["The Rock", "Goblins"]

        await svc.analyze_deck(MAIN_DECK, SIDE_DECK, "premodern", "en", meta_archetypes=custom_meta)

        call_args = svc._call_groq.call_args
        # messages is the first positional arg to _call_groq(messages, temperature=...)
        user_content = call_args[0][0][1]["content"]
        assert "The Rock" in user_content or "Goblins" in user_content

    async def test_falls_back_to_format_archetypes_when_none(self):
        svc = _make_service()
        svc._call_groq = AsyncMock(return_value=VALID_ANALYSIS_JSON)

        await svc.analyze_deck(MAIN_DECK, SIDE_DECK, "premodern", "en", meta_archetypes=None)

        # Should still call the API (using format's built-in archetypes)
        svc._call_groq.assert_called_once()


class TestGenerateRandomDeck:
    async def test_returns_random_deck_response(self):
        svc = _make_service()
        # First call: generate deck; second call: review deck
        svc._call_groq = AsyncMock(return_value=VALID_RANDOM_DECK_JSON)

        result = await svc.generate_random_deck(locale="en", format_name="premodern")

        assert isinstance(result, RandomDeckResponse)
        assert svc._call_groq.call_count == 2  # generate + review pass

    async def test_retries_when_deck_too_small(self):
        small_deck = json.dumps({
            "deck_name": "Incomplete",
            "format_name": "premodern",
            "archetype": "Burn",
            "strategy_summary": "...",
            "brief_analysis": "...",
            "main_deck": [{"name": "Mountain", "quantity": 10}],  # < 60 cards
            "sideboard": [],
        })
        full_deck = VALID_RANDOM_DECK_JSON

        svc = _make_service()
        svc._call_groq = AsyncMock(side_effect=[small_deck, full_deck, full_deck])

        result = await svc.generate_random_deck(locale="en", format_name="premodern")

        assert isinstance(result, RandomDeckResponse)
        assert svc._call_groq.call_count >= 2

    async def test_review_failure_returns_original_deck(self):
        svc = _make_service()
        # generate OK, review raises
        svc._call_groq = AsyncMock(side_effect=[VALID_RANDOM_DECK_JSON, Exception("review failed")])

        result = await svc.generate_random_deck(locale="en", format_name="premodern")

        assert isinstance(result, RandomDeckResponse)
        assert result.deck_name == "Sligh"
