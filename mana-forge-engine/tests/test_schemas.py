"""Tests for Pydantic schemas in deck_schemas.py."""
import pytest
from pydantic import ValidationError

from schemas.deck_schemas import (
    CardInput,
    SideboardRequest,
    DeckAnalysisRequest,
    RandomDeckRequest,
    SideboardResponse,
    SideboardSuggestion,
)


class TestCardInput:
    def test_created_with_alias(self):
        card = CardInput(card_name="Lightning Bolt", quantity=4)
        assert card.name == "Lightning Bolt"
        assert card.quantity == 4

    def test_created_with_field_name(self):
        # populate_by_name=True allows using 'name' directly
        card = CardInput(name="Lightning Bolt", quantity=4)
        assert card.name == "Lightning Bolt"

    def test_missing_quantity_raises(self):
        with pytest.raises(ValidationError):
            CardInput(card_name="Lightning Bolt")

    def test_missing_name_raises(self):
        with pytest.raises(ValidationError):
            CardInput(quantity=4)


class TestLocaleValidator:
    """The locale validator is shared across SideboardRequest, DeckAnalysisRequest,
    and RandomDeckRequest — test via SideboardRequest for brevity."""

    MINIMAL_DECK = [{"card_name": "Mountain", "quantity": 20}]

    def test_supported_locale_passthrough(self):
        req = SideboardRequest(main_deck=self.MINIMAL_DECK, format_name="premodern", locale="es")
        assert req.locale == "es"

    def test_locale_with_region_is_normalised(self):
        req = SideboardRequest(main_deck=self.MINIMAL_DECK, format_name="premodern", locale="es-ES")
        assert req.locale == "es"

    def test_unsupported_locale_falls_back_to_en(self):
        req = SideboardRequest(main_deck=self.MINIMAL_DECK, format_name="premodern", locale="xx")
        assert req.locale == "en"

    def test_all_supported_locales_accepted(self):
        for locale in ("es", "en", "fr", "de", "it", "pt"):
            req = SideboardRequest(main_deck=self.MINIMAL_DECK, format_name="premodern", locale=locale)
            assert req.locale == locale

    def test_analysis_request_locale_normalised(self):
        req = DeckAnalysisRequest(
            main_deck=self.MINIMAL_DECK, format_name="premodern", locale="fr-FR"
        )
        assert req.locale == "fr"

    def test_random_deck_request_locale_normalised(self):
        req = RandomDeckRequest(locale="pt-BR")
        assert req.locale == "pt"


class TestDeckAnalysisRequest:
    MINIMAL_DECK = [{"card_name": "Mountain", "quantity": 20}]

    def test_sideboard_optional(self):
        req = DeckAnalysisRequest(main_deck=self.MINIMAL_DECK, format_name="premodern", locale="en")
        assert req.sideboard is None

    def test_meta_archetypes_optional(self):
        req = DeckAnalysisRequest(main_deck=self.MINIMAL_DECK, format_name="premodern", locale="en")
        assert req.meta_archetypes is None

    def test_meta_archetypes_accepted(self):
        req = DeckAnalysisRequest(
            main_deck=self.MINIMAL_DECK,
            format_name="premodern",
            locale="en",
            meta_archetypes=["Burn", "The Rock"],
        )
        assert req.meta_archetypes == ["Burn", "The Rock"]


class TestRandomDeckRequest:
    def test_format_name_optional(self):
        req = RandomDeckRequest(locale="en")
        assert req.format_name is None

    def test_format_name_accepted(self):
        req = RandomDeckRequest(locale="en", format_name="premodern")
        assert req.format_name == "premodern"
