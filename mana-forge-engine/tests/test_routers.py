"""Tests for HTTP routers — AIService dependency is replaced with a mock."""
import pytest
from unittest.mock import AsyncMock

from tests.conftest import (
    BURN_DECK_PAYLOAD,
    MOCK_SIDEBOARD_RESPONSE,
    MOCK_ANALYSIS_RESPONSE,
    MOCK_RANDOM_DECK_RESPONSE,
)


# ---------------------------------------------------------------------------
# Health endpoint
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_returns_ok(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["service"] == "mana-forge-engine"


# ---------------------------------------------------------------------------
# POST /v1/ai/suggest-sideboard
# ---------------------------------------------------------------------------

class TestSuggestSideboard:
    def test_success_returns_200_with_suggestions(self, client, mock_service):
        mock_service.suggest_sideboard.return_value = MOCK_SIDEBOARD_RESPONSE
        payload = {
            "main_deck": BURN_DECK_PAYLOAD,
            "format_name": "premodern",
            "locale": "es",
        }
        response = client.post("/v1/ai/suggest-sideboard", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "suggestions" in data
        assert "analysis" in data
        assert len(data["suggestions"]) > 0

    def test_value_error_returns_502(self, client, mock_service):
        mock_service.suggest_sideboard.side_effect = ValueError("AI returned bad response")
        payload = {"main_deck": BURN_DECK_PAYLOAD, "format_name": "premodern", "locale": "en"}

        response = client.post("/v1/ai/suggest-sideboard", json=payload)

        assert response.status_code == 502

    def test_runtime_error_returns_502(self, client, mock_service):
        mock_service.suggest_sideboard.side_effect = RuntimeError("Groq not initialised")
        payload = {"main_deck": BURN_DECK_PAYLOAD, "format_name": "premodern", "locale": "en"}

        response = client.post("/v1/ai/suggest-sideboard", json=payload)

        assert response.status_code == 502

    def test_unexpected_exception_returns_500(self, client, mock_service):
        mock_service.suggest_sideboard.side_effect = Exception("unexpected crash")
        payload = {"main_deck": BURN_DECK_PAYLOAD, "format_name": "premodern", "locale": "en"}

        response = client.post("/v1/ai/suggest-sideboard", json=payload)

        assert response.status_code == 500

    def test_invalid_body_returns_422(self, client):
        response = client.post("/v1/ai/suggest-sideboard", json={"wrong": "payload"})
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# POST /v1/ai/analyze-deck
# ---------------------------------------------------------------------------

class TestAnalyzeDeck:
    def test_success_returns_200_with_analysis(self, client, mock_service):
        mock_service.analyze_deck.return_value = MOCK_ANALYSIS_RESPONSE
        payload = {
            "main_deck": BURN_DECK_PAYLOAD,
            "sideboard": [{"card_name": "Pyroblast", "quantity": 4}],
            "format_name": "premodern",
            "locale": "es",
        }
        response = client.post("/v1/ai/analyze-deck", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "general_summary" in data
        assert "matchups" in data
        assert "strengths" in data

    def test_without_sideboard_returns_200(self, client, mock_service):
        mock_service.analyze_deck.return_value = MOCK_ANALYSIS_RESPONSE
        payload = {
            "main_deck": BURN_DECK_PAYLOAD,
            "format_name": "premodern",
            "locale": "en",
        }
        response = client.post("/v1/ai/analyze-deck", json=payload)
        assert response.status_code == 200

    def test_with_custom_meta_archetypes(self, client, mock_service):
        mock_service.analyze_deck.return_value = MOCK_ANALYSIS_RESPONSE
        payload = {
            "main_deck": BURN_DECK_PAYLOAD,
            "format_name": "premodern",
            "locale": "en",
            "meta_archetypes": ["The Rock", "Goblins", "Burn"],
        }
        response = client.post("/v1/ai/analyze-deck", json=payload)
        assert response.status_code == 200

    def test_value_error_returns_502(self, client, mock_service):
        mock_service.analyze_deck.side_effect = ValueError("bad schema")
        payload = {"main_deck": BURN_DECK_PAYLOAD, "format_name": "premodern", "locale": "en"}

        response = client.post("/v1/ai/analyze-deck", json=payload)
        assert response.status_code == 502

    def test_unexpected_exception_returns_500(self, client, mock_service):
        mock_service.analyze_deck.side_effect = Exception("crash")
        payload = {"main_deck": BURN_DECK_PAYLOAD, "format_name": "premodern", "locale": "en"}

        response = client.post("/v1/ai/analyze-deck", json=payload)
        assert response.status_code == 500

    def test_invalid_body_returns_422(self, client):
        response = client.post("/v1/ai/analyze-deck", json={})
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# POST /v1/ai/generate-random-deck
# ---------------------------------------------------------------------------

class TestGenerateRandomDeck:
    def test_success_returns_200_with_deck(self, client, mock_service):
        mock_service.generate_random_deck.return_value = MOCK_RANDOM_DECK_RESPONSE
        payload = {"locale": "es", "format_name": "premodern"}

        response = client.post("/v1/ai/generate-random-deck", json=payload)

        assert response.status_code == 200
        data = response.json()
        assert "deck_name" in data
        assert "main_deck" in data
        assert "archetype" in data

    def test_without_format_name_returns_200(self, client, mock_service):
        mock_service.generate_random_deck.return_value = MOCK_RANDOM_DECK_RESPONSE
        payload = {"locale": "en"}

        response = client.post("/v1/ai/generate-random-deck", json=payload)
        assert response.status_code == 200

    def test_value_error_returns_502(self, client, mock_service):
        mock_service.generate_random_deck.side_effect = ValueError("bad deck")
        payload = {"locale": "en", "format_name": "premodern"}

        response = client.post("/v1/ai/generate-random-deck", json=payload)
        assert response.status_code == 502

    def test_unexpected_exception_returns_500(self, client, mock_service):
        mock_service.generate_random_deck.side_effect = Exception("crash")
        payload = {"locale": "en", "format_name": "premodern"}

        response = client.post("/v1/ai/generate-random-deck", json=payload)
        assert response.status_code == 500

    def test_invalid_body_returns_422(self, client):
        response = client.post("/v1/ai/generate-random-deck", json={})
        assert response.status_code == 422

    def test_locale_normalised_in_request(self, client, mock_service):
        mock_service.generate_random_deck.return_value = MOCK_RANDOM_DECK_RESPONSE
        payload = {"locale": "es-ES", "format_name": "premodern"}

        response = client.post("/v1/ai/generate-random-deck", json=payload)
        assert response.status_code == 200
