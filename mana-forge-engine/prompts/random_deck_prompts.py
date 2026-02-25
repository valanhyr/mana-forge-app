from typing import Optional
from prompts.format_context import get_ban_list_str, get_sets_str, get_deck_size, requires_sideboard, is_singleton, get_format_notes


def get_random_deck_system_prompt() -> str:
    return (
        "You are a world-class Magic: The Gathering deck-building AI and format expert. "
        "You have deep knowledge of every format's ban list and card pool. "
        "You NEVER include banned or illegal cards in any deck list. "
        "You only use real, existing Magic: The Gathering card names that are legal in the requested format. "
        "You create varied, competitive, and fun decks — never defaulting to the same archetype twice. "
        "Your output must be a valid JSON object and nothing else — no markdown, no extra text."
    )


def get_random_deck_user_prompt(locale: str, format_name: Optional[str] = None, archetype_hint: Optional[str] = None) -> str:
    if format_name:
        sets_str = get_sets_str(format_name)
        ban_str = get_ban_list_str(format_name)
        deck_size = get_deck_size(format_name)
        needs_side = requires_sideboard(format_name)
        singleton = is_singleton(format_name)
        format_notes = get_format_notes(format_name)

        format_instruction = f"The deck MUST be legal in the '{format_name}' format."
        if sets_str:
            format_instruction += f" {sets_str}"
        if ban_str:
            format_instruction += f"\n{ban_str}"
        if format_notes:
            format_instruction += f"\nFORMAT NOTES: {format_notes}"

        copy_rule = (
            "Only 1 copy of each non-basic-land card is allowed (singleton format)."
            if singleton else
            "Up to 4 copies of each non-basic-land card are allowed."
        )
        sideboard_instruction = (
            "Include a 15-card sideboard ('sideboard' field)."
            if needs_side else
            "This format does not use a sideboard; set 'sideboard' to an empty list []."
        )
    else:
        format_instruction = (
            "Choose a popular and competitive Magic: The Gathering format "
            "(Premodern, Legacy, or Vintage preferred — avoid Modern or Standard)."
        )
        deck_size = 60
        copy_rule = "Up to 4 copies of each non-basic-land card are allowed."
        sideboard_instruction = "Include a 15-card sideboard ('sideboard' field)."

    if archetype_hint:
        archetype_instruction = (
            f"You MUST build the deck around the '{archetype_hint}' archetype. "
            f"This is a mandatory constraint — do not ignore it or substitute a different archetype."
        )
    else:
        archetype_instruction = "Choose a competitive archetype appropriate for the format."

    return f"""
    Generate a complete, competitive, and legal Magic: The Gathering deck.
    {format_instruction}

    ARCHETYPE DIRECTIVE: {archetype_instruction}

    *** CRITICAL CARD COUNT REQUIREMENT ***
    The 'main_deck' list MUST sum to EXACTLY {deck_size} cards when all quantities are added together.
    Count carefully before returning. If you are at {deck_size - 10}, add more cards. Do NOT stop early.
    A deck with fewer than {deck_size} cards is INVALID and will be rejected.

    Other requirements:
    - {copy_rule}
    - {sideboard_instruction}
    - Card names in 'main_deck' and 'sideboard' MUST always be in English.
    - Only use real, existing card names that are 100% legal in the format. If unsure about a card, omit it.
    - The deck should be genuinely competitive and represent a real, viable strategy for the current meta.

    All textual fields ('deck_name', 'strategy_summary', 'brief_analysis') must be in the '{locale}' language.

    You MUST return a JSON object with exactly this structure:
    {{
        "deck_name": "A creative and fitting name for the deck",
        "format_name": "The name of the format",
        "archetype": "The deck's archetype (e.g. Aggro, Control, Combo, Midrange)",
        "strategy_summary": "A paragraph explaining the deck's strategy, win condition, and key interactions",
        "brief_analysis": "A paragraph on the deck's strengths and weaknesses in the current meta",
        "main_deck": [
            {{"name": "Card Name", "quantity": 4}},
            ...
        ],
        "sideboard": [
            {{"name": "Card Name", "quantity": 2}},
            ...
        ]
    }}
    """