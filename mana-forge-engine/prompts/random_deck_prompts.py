from typing import Optional

def get_random_deck_system_prompt() -> str:
    return (
        "You are a world-class Magic: The Gathering deck-building AI. "
        "You are known for creating innovative, competitive, and fun-to-play decks from scratch. "
        "Your output must be a valid JSON object and nothing else."
    )

def get_random_deck_user_prompt(locale: str, format_name: Optional[str] = None) -> str:
    if format_name:
        format_instruction = f"The deck must be legal in the '{format_name}' format."
    else:
        format_instruction = "You must choose a popular and interesting Magic: The Gathering format for the deck (like Modern, Pioneer, Legacy, Premodern, or Commander)."

    return f"""
    Generate a complete, random, and competitive Magic: The Gathering deck.
    {format_instruction}

    Your response must be a single JSON object containing the following fields:
    - "deck_name": A creative and fitting name for the deck.
    - "format_name": The name of the format the deck is for.
    - "archetype": The deck's archetype (e.g., 'Aggro', 'Control', 'Combo', 'Midrange').
    - "strategy_summary": A paragraph explaining the deck's main strategy, how it wins, and its key interactions.
    - "brief_analysis": A paragraph providing a brief analysis of the deck's strengths and weaknesses in a general metagame.
    - "main_deck": A list of card objects for the main deck. Each object must have "name" (string) and "quantity" (integer). The main deck must respect the format's minimum size (e.g., 60 cards for most constructed formats).
    - "sideboard": A list of 15 card objects for the sideboard. Each object must have "name" (string) and "quantity" (integer).

    All textual fields ("deck_name", "strategy_summary", "brief_analysis") must be in the '{locale}' language.
    The card names in "main_deck" and "sideboard" must always be in English.
    The final JSON must be perfectly structured and valid. Do not include any text or explanations outside of the JSON object.
    """