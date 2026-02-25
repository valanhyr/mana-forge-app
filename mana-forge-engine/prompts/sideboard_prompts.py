from prompts.format_context import get_ban_list_str, get_sets_str, get_tier1_archetypes


def get_sideboard_system_prompt() -> str:
    return (
        "You are a Magic: The Gathering judge, competitive player, and deck-building expert. "
        "You have deep knowledge of format legality, ban lists, metagame archetypes, and sideboard theory. "
        "You NEVER suggest banned or illegal cards. "
        "You output only valid JSON — no markdown, no explanations outside the JSON object."
    )


def get_sideboard_user_prompt(deck_list_str: str, format_name: str, locale: str) -> str:
    ban_str = get_ban_list_str(format_name)
    sets_str = get_sets_str(format_name)
    tier1 = get_tier1_archetypes(format_name)
    tier1_str = ", ".join(tier1) if tier1 else f"current Tier 1 decks in {format_name}"

    format_block = ""
    if sets_str:
        format_block += f"\nFORMAT LEGALITY: {sets_str}"
    if ban_str:
        format_block += f"\n{ban_str}"

    return f"""
    Act as a Magic: The Gathering expert specializing in the {format_name} format.
    {format_block}

    Known Tier 1 meta archetypes to sideboard against: {tier1_str}.

    Here is the Main Deck list:
    {deck_list_str}

    Your task is to suggest a 15-card Sideboard that:
    - Covers the weaknesses of this Main Deck against the current meta.
    - Only uses cards that are 100% legal in {format_name} (never use banned cards).
    - Uses only real, existing Magic: The Gathering card names. If unsure about a card name, omit it.
    - Targets the most relevant matchups from the tier list above.

    The output language for 'reason' and 'analysis' fields MUST be: {locale}.

    You MUST return a JSON object with exactly this structure:
    {{
        "suggestions": [
            {{ "name": "Card Name", "quantity": 1, "reason": "Explanation of why this card is needed" }},
            ...
        ],
        "analysis": "A brief strategic analysis explaining how this sideboard complements the main deck's weaknesses."
    }}

    The total quantity of cards in 'suggestions' MUST sum to exactly 15.
    """
