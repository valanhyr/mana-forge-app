from pydantic import BaseModel, Field
from typing import List, Optional

class CardInput(BaseModel):
    name: str
    quantity: int

class SideboardRequest(BaseModel):
    main_deck: List[CardInput]
    format_name: str
    locale: str = Field(default="en", description="Language for the analysis (e.g., 'es', 'en')")

class Suggestion(BaseModel):
    name: str
    quantity: int
    reason: str

class SideboardResponse(BaseModel):
    suggestions: List[Suggestion]
    analysis: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "suggestions": [{"name": "Tormod's Crypt", "quantity": 2, "reason": "Graveyard hate"}],
                "analysis": "This deck struggles against reanimator strategies..."
            }
        }

# --- Nuevos Schemas para Análisis Completo ---

class SwapSuggestion(BaseModel):
    card_out: str
    card_in: str
    quantity: int
    reason: str

class SideboardSwap(BaseModel):
    card_name: str
    quantity: int

class MatchupAnalysis(BaseModel):
    archetype: str
    win_rate_pre: int = Field(description="Estimated win rate percentage pre-sideboard (0-100)")
    win_rate_post: int = Field(description="Estimated win rate percentage post-sideboard (0-100)")
    key_cards_opponent: List[str]
    strategy: str
    sideboard_in: List[SideboardSwap]
    sideboard_out: List[SideboardSwap]

class DeckAnalysisResponse(BaseModel):
    mana_curve_analysis: str
    strengths: List[str]
    weaknesses: List[str]
    matchups: List[MatchupAnalysis]
    suggested_changes: List[SwapSuggestion]
    general_summary: str

class DeckAnalysisRequest(BaseModel):
    main_deck: List[CardInput]
    sideboard: List[CardInput]
    format_name: str
    locale: str = Field(default="en", description="Language for the analysis")
    meta_archetypes: Optional[List[str]] = Field(default=None, description="List of specific archetypes to analyze against")
