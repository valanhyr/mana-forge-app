"""Tests for prompts/format_context.py pure helper functions."""
import pytest

from prompts.format_context import (
    get_format_context,
    get_tier1_archetypes,
    get_deck_size,
    is_singleton,
    requires_sideboard,
    get_ban_list_str,
    get_sets_str,
    get_format_notes,
)


class TestGetFormatContext:
    def test_known_format_returns_dict(self):
        ctx = get_format_context("premodern")
        assert isinstance(ctx, dict)

    def test_lookup_is_case_insensitive(self):
        assert get_format_context("Premodern") == get_format_context("premodern")
        assert get_format_context("MODERN") == get_format_context("modern")

    def test_unknown_format_returns_none(self):
        assert get_format_context("vintage") is None

    def test_none_returns_none(self):
        assert get_format_context(None) is None

    def test_edh_alias_equals_commander(self):
        assert get_format_context("edh") == get_format_context("commander")


class TestGetTier1Archetypes:
    def test_premodern_includes_burn(self):
        archetypes = get_tier1_archetypes("premodern")
        assert "Burn" in archetypes

    def test_commander_returns_list(self):
        archetypes = get_tier1_archetypes("commander")
        assert isinstance(archetypes, list)
        assert len(archetypes) > 0

    def test_unknown_format_returns_empty_list(self):
        assert get_tier1_archetypes("unknown_format") == []

    def test_none_returns_empty_list(self):
        assert get_tier1_archetypes(None) == []

    def test_all_main_formats_have_archetypes(self):
        for fmt in ("premodern", "modern", "legacy", "pauper", "commander"):
            assert len(get_tier1_archetypes(fmt)) > 0, f"{fmt} should have archetypes"


class TestGetDeckSize:
    def test_premodern_is_60(self):
        assert get_deck_size("premodern") == 60

    def test_commander_is_100(self):
        assert get_deck_size("commander") == 100

    def test_unknown_format_defaults_to_60(self):
        assert get_deck_size("unknown") == 60

    def test_none_defaults_to_60(self):
        assert get_deck_size(None) == 60


class TestIsSingleton:
    def test_commander_is_singleton(self):
        assert is_singleton("commander") is True

    def test_premodern_is_not_singleton(self):
        assert is_singleton("premodern") is False

    def test_none_is_not_singleton(self):
        assert is_singleton(None) is False

    def test_cedh_is_singleton(self):
        assert is_singleton("cedh") is True

    def test_pauper_is_not_singleton(self):
        assert is_singleton("pauper") is False


class TestRequiresSideboard:
    def test_premodern_requires_sideboard(self):
        assert requires_sideboard("premodern") is True

    def test_commander_does_not_require_sideboard(self):
        assert requires_sideboard("commander") is False

    def test_none_defaults_to_true(self):
        assert requires_sideboard(None) is True

    def test_pauper_requires_sideboard(self):
        assert requires_sideboard("pauper") is True


class TestGetBanListStr:
    def test_premodern_contains_banned_cards(self):
        ban_str = get_ban_list_str("premodern")
        assert "Balance" in ban_str
        assert "Necropotence" in ban_str
        assert "Brainstorm" in ban_str

    def test_unknown_format_returns_empty_string(self):
        assert get_ban_list_str("unknown") == ""

    def test_none_returns_empty_string(self):
        assert get_ban_list_str(None) == ""

    def test_contains_warning_text(self):
        ban_str = get_ban_list_str("modern")
        assert "BANNED" in ban_str


class TestGetSetsStr:
    def test_premodern_mentions_key_sets(self):
        sets_str = get_sets_str("premodern")
        assert "Tempest" in sets_str
        assert "Scourge" in sets_str

    def test_unknown_format_returns_empty_string(self):
        assert get_sets_str("unknown") == ""


class TestGetFormatNotes:
    def test_premodern_has_notes(self):
        notes = get_format_notes("premodern")
        assert len(notes) > 0

    def test_unknown_returns_empty(self):
        assert get_format_notes("unknown") == ""
