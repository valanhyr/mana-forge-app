from prompts.format_context import get_ban_list_str, get_sets_str


def get_scores_system_prompt() -> str:
    return (
        "You are a Magic: The Gathering expert analyst. "
        "You evaluate decks objectively across 6 strategic dimensions. "
        "You only use real, existing card names from the deck provided. "
        "You output only valid JSON."
    )


def get_scores_user_prompt(main_deck_str: str, format_name: str, locale: str) -> str:
    ban_str = get_ban_list_str(format_name)
    sets_str = get_sets_str(format_name)

    format_block = ""
    if sets_str:
        format_block += f"\nFORMAT LEGALITY: {sets_str}"
    if ban_str:
        format_block += f"\n{ban_str}"

    return f"""
    You are evaluating a {format_name} deck. {format_block}

    Main Deck:
    {main_deck_str}

    Rate this deck on 6 dimensions from 1 (very low) to 10 (exceptional).
    For EACH dimension, list up to 3 key cards from the deck that most influence that score.

    - speed: How fast can the deck win? (1 = very slow, 10 = turn 1-2)
    - consistency: How reliably does it execute its plan? (1 = inconsistent, 10 = very consistent)
    - aggression: How proactively does it apply pressure? (1 = pure reactive, 10 = relentless aggro)
    - resilience: How well does it recover from disruption? (1 = fragile, 10 = very resilient)
    - interaction: How much does it interact with the opponent? (1 = none, 10 = full of answers)
    - combo_potential: How combo-oriented is the deck? (1 = pure fair magic, 10 = all-in combo)

    Rules:
    - All score values must be integers between 1 and 10.
    - key_cards must only contain real card names present in the deck above.
    - The output language for all text fields MUST be: {locale}.

    Return ONLY this JSON:
    {{
        "scores": {{
            "speed":           {{"value": 7, "key_cards": ["Card A", "Card B"]}},
            "consistency":     {{"value": 8, "key_cards": ["Card C"]}},
            "aggression":      {{"value": 5, "key_cards": ["Card D", "Card E"]}},
            "resilience":      {{"value": 6, "key_cards": ["Card F"]}},
            "interaction":     {{"value": 7, "key_cards": ["Card G", "Card H"]}},
            "combo_potential": {{"value": 3, "key_cards": []}}
        }}
    }}
    """
