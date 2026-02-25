from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import List, Optional, Literal

SUPPORTED_LOCALES = {"es", "en", "fr", "de", "it", "pt"}

class CardInput(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    name: str = Field(alias="card_name")
    quantity: int

# --- Schemas for Sideboard Suggestion ---
class SideboardSuggestion(BaseModel):
    name: str
    quantity: int
    reason: str

class SideboardResponse(BaseModel):
    suggestions: List[SideboardSuggestion]
    analysis: str

class SideboardRequest(BaseModel):
    main_deck: List[CardInput]
    format_name: str
    locale: str

    @field_validator("locale")
    @classmethod
    def validate_locale(cls, v: str) -> str:
        normalized = v.split("-")[0].lower()
        return normalized if normalized in SUPPORTED_LOCALES else "en"

# --- Schemas for Deck Analysis ---
class MatchupAnalysis(BaseModel):
    archetype: str
    win_rate_pre: float
    win_rate_post: float
    key_cards_opponent: List[str]
    strategy: str
    sideboard_in: List[CardInput]
    sideboard_out: List[CardInput]

class SuggestedChange(BaseModel):
    card_out: str
    card_in: str
    quantity: int
    reason: str

class DeckAnalysisResponse(BaseModel):
    mana_curve_analysis: str
    strengths: List[str]
    weaknesses: List[str]
    matchups: List[MatchupAnalysis]
    suggested_changes: List[SuggestedChange]
    general_summary: str

class DeckAnalysisRequest(BaseModel):
    main_deck: List[CardInput]
    sideboard: Optional[List[CardInput]] = None
    format_name: str
    locale: str
    meta_archetypes: Optional[List[str]] = None

    @field_validator("locale")
    @classmethod
    def validate_locale(cls, v: str) -> str:
        normalized = v.split("-")[0].lower()
        return normalized if normalized in SUPPORTED_LOCALES else "en"

# --- Schemas for Random Deck Generation ---
class RandomDeckRequest(BaseModel):
    locale: str
    format_name: Optional[str] = None

    @field_validator("locale")
    @classmethod
    def validate_locale(cls, v: str) -> str:
        normalized = v.split("-")[0].lower()
        return normalized if normalized in SUPPORTED_LOCALES else "en"

class CardOutput(BaseModel):
    name: str
    quantity: int

class RandomDeckResponse(BaseModel):
    deck_name: str
    format_name: str
    archetype: str
    strategy_summary: str
    brief_analysis: str
    main_deck: List[CardOutput]
    sideboard: List[CardOutput]
