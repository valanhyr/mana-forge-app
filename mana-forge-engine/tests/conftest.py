"""Shared fixtures for mana-forge-engine tests."""
import pytest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from main import app
from services.ai_service import AIService
from services.dependencies import get_ai_service
from schemas.deck_schemas import (
    SideboardResponse, SideboardSuggestion,
    DeckAnalysisResponse, MatchupAnalysis, SuggestedChange, DeckScores,
    RandomDeckResponse, CardOutput,
)

# ---------------------------------------------------------------------------
# Canned AI responses used across tests
# ---------------------------------------------------------------------------

MOCK_SIDEBOARD_RESPONSE = SideboardResponse(
    suggestions=[
        SideboardSuggestion(name="Tormod's Crypt", quantity=2, reason="Anti-reanimator"),
        SideboardSuggestion(name="Pyroblast", quantity=4, reason="Counters blue spells"),
    ],
    analysis="Solid sideboard choices for the Premodern metagame.",
)

MOCK_ANALYSIS_RESPONSE = DeckAnalysisResponse(
    mana_curve_analysis="Very low curve, aggressive 1-2 drops dominate.",
    strengths=["Fast clock", "Consistent burn"],
    weaknesses=["Vulnerable to life-gain", "Poor late game"],
    matchups=[
        MatchupAnalysis(
            archetype="The Rock",
            win_rate_pre=0.60,
            win_rate_post=0.55,
            key_cards_opponent=["Pernicious Deed", "Duress"],
            strategy="Race before their removal comes online.",
            sideboard_in=[],
            sideboard_out=[],
        )
    ],
    suggested_changes=[
        SuggestedChange(card_out="Lava Spike", card_in="Fireblast", quantity=2, reason="More reach")
    ],
    general_summary="Strong mono-red aggro deck.",
    scores=DeckScores(
        speed=9,
        consistency=7,
        aggression=10,
        resilience=3,
        interaction=4,
        combo_potential=2,
    ),
)

MOCK_RANDOM_DECK_RESPONSE = RandomDeckResponse(
    deck_name="Sligh",
    format_name="premodern",
    archetype="Burn",
    strategy_summary="Fast mono-red aggro.",
    brief_analysis="Classic Sligh archetype.",
    main_deck=[
        CardOutput(name="Mountain", quantity=20),
        CardOutput(name="Lightning Bolt", quantity=4),
        CardOutput(name="Jackal Pup", quantity=4),
        CardOutput(name="Mogg Fanatic", quantity=4),
        CardOutput(name="Fireblast", quantity=4),
        CardOutput(name="Incinerate", quantity=4),
        CardOutput(name="Ball Lightning", quantity=4),
        CardOutput(name="Price of Progress", quantity=4),
        CardOutput(name="Cursed Scroll", quantity=4),
        CardOutput(name="Grim Lavamancer", quantity=4),
        CardOutput(name="Wasteland", quantity=4),
    ],
    sideboard=[
        CardOutput(name="Pyroblast", quantity=4),
        CardOutput(name="Tormod's Crypt", quantity=3),
        CardOutput(name="Shattering Pulse", quantity=4),
        CardOutput(name="Sulfuric Vortex", quantity=4),
    ],
)


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_service():
    svc = MagicMock(spec=AIService)
    svc.suggest_sideboard = AsyncMock(return_value=MOCK_SIDEBOARD_RESPONSE)
    svc.analyze_deck = AsyncMock(return_value=MOCK_ANALYSIS_RESPONSE)
    svc.generate_random_deck = AsyncMock(return_value=MOCK_RANDOM_DECK_RESPONSE)
    return svc


@pytest.fixture
def client(mock_service):
    app.dependency_overrides[get_ai_service] = lambda: mock_service
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Reusable request payloads
# ---------------------------------------------------------------------------

BURN_DECK_PAYLOAD = [
    {"card_name": "Mountain", "quantity": 20},
    {"card_name": "Lightning Bolt", "quantity": 4},
    {"card_name": "Jackal Pup", "quantity": 4},
    {"card_name": "Mogg Fanatic", "quantity": 4},
    {"card_name": "Grim Lavamancer", "quantity": 4},
    {"card_name": "Fireblast", "quantity": 4},
    {"card_name": "Incinerate", "quantity": 4},
    {"card_name": "Ball Lightning", "quantity": 4},
    {"card_name": "Price of Progress", "quantity": 4},
    {"card_name": "Cursed Scroll", "quantity": 4},
    {"card_name": "Wasteland", "quantity": 4},
]
