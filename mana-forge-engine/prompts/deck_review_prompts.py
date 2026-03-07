import json
from typing import Optional


def get_deck_review_system_prompt() -> str:
    return (
        "You are a strict Magic: The Gathering deck auditor and editor. "
        "You receive a generated deck and must review it for three things:\n"
        "1. STRATEGY COHERENCE: every card in main_deck and sideboard must support the stated archetype and strategy_summary. "
        "Replace cards that are off-strategy with better choices.\n"
        "2. CARD COUNT: the total quantity in main_deck must be EXACTLY correct for the format. "
        "Do not return fewer or more cards than required. Add or remove cards as needed.\n"
        "3. MANA BASE: the deck must have a solid, well-proportioned mana base. "
        "Verify the number of lands is appropriate (typically 20-26 for 60-card decks, 37-40 for 100-card decks). "
        "Ensure color sources are consistent with the spell requirements.\n"
        "You MUST preserve the original deck_name, format_name, archetype, strategy_summary, brief_analysis "
        "unless a correction is strictly necessary. "
        "You NEVER include banned or illegal cards. "
        "All card names in main_deck and sideboard must be in English. "
        "Your output must be a valid JSON object and nothing else — no markdown, no extra text."
    )


def get_deck_review_user_prompt(
    deck_json: dict,
    format_name: Optional[str],
    deck_size: int,
    needs_side: bool,
    singleton: bool,
    locale: str,
) -> str:
    copy_rule = (
        "Only 1 copy of each non-basic-land card is allowed (singleton)."
        if singleton else
        "Up to 4 copies of each non-basic-land card are allowed."
    )

    if deck_size == 100:
        count_rule = (
            f"main_deck quantities MUST sum to EXACTLY {deck_size}. "
            "This is a hard requirement — not a minimum, not a maximum."
        )
    else:
        count_rule = (
            f"main_deck quantities MUST sum to AT LEAST {deck_size} cards. "
            f"Exactly {deck_size} is the standard and strongly preferred."
        )

    sideboard_rule = (
        "sideboard must contain exactly 15 cards total (across all entries)."
        if needs_side else
        "sideboard must be an empty list []."
    )

    deck_str = json.dumps(deck_json, ensure_ascii=False, indent=2)

    return f"""
Review and correct the following Magic: The Gathering deck for format '{format_name or "unknown"}'.

RULES TO ENFORCE:
- {count_rule}
- {copy_rule}
- {sideboard_rule}
- Every card must be legal in the format (not banned, correct set pool).
- The mana base must be solid: correct number of lands and correct color distribution.
- All cards in main_deck and sideboard must clearly support the archetype and strategy.

DECK TO REVIEW:
{deck_str}

Return the corrected deck as a JSON object with EXACTLY this structure:
{{
    "deck_name": "...",
    "format_name": "...",
    "archetype": "...",
    "strategy_summary": "...",
    "brief_analysis": "...",
    "main_deck": [{{"name": "Card Name", "quantity": N}}, ...],
    "sideboard": [{{"name": "Card Name", "quantity": N}}, ...]
}}

All textual fields (deck_name, strategy_summary, brief_analysis) must be in the '{locale}' language.
Card names in main_deck and sideboard must always be in English.
"""
