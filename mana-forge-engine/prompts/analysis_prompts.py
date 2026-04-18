from typing import List, Optional
from prompts.format_context import get_ban_list_str, get_sets_str, get_tier1_archetypes


def get_analysis_system_prompt() -> str:
    return (
        "You are a Magic: The Gathering judge, competitive player, and strategic analyst. "
        "You have encyclopedic knowledge of every format's legality, ban lists, and metagame. "
        "You NEVER reference banned or illegal cards as valid options. "
        "You only use real, existing card names — never invented ones. "
        "You provide deep strategic analysis and output only valid JSON."
    )


def get_analysis_user_prompt(main_deck_str: str, sideboard_str: str, format_name: str, locale: str, archetypes: Optional[List[str]] = None) -> str:
    ban_str = get_ban_list_str(format_name)
    sets_str = get_sets_str(format_name)
    tier1_fallback = get_tier1_archetypes(format_name)

    format_block = ""
    if sets_str:
        format_block += f"\nFORMAT LEGALITY: {sets_str}"
    if ban_str:
        format_block += f"\n{ban_str}"

    if archetypes and len(archetypes) > 0:
        archetypes_str = ", ".join(archetypes)
        matchup_instruction = (
            f"3. Matchup Analysis: From the following Tier 1 archetypes in {format_name}, "
            f"select the 5 most relevant/difficult matchups: {archetypes_str}. For each provide:"
        )
    elif tier1_fallback:
        archetypes_str = ", ".join(tier1_fallback)
        matchup_instruction = (
            f"3. Matchup Analysis: From the following known Tier 1 archetypes in {format_name}, "
            f"select the 5 most relevant/difficult matchups: {archetypes_str}. For each provide:"
        )
    else:
        matchup_instruction = (
            f"3. Matchup Analysis: Select the top 5 Tier 1 decks in {format_name} "
            f"based on the current metagame. For each provide:"
        )

    return f"""
    Act as a Magic: The Gathering expert specializing in the {format_name} format.
    {format_block}

    Perform a comprehensive analysis of the following deck.

    Main Deck:
    {main_deck_str}

    Sideboard:
    {sideboard_str}

    Your analysis must include:
    1. Mana Curve Analysis: Evaluate if the mana curve fits the archetype.
    2. Strengths & Weaknesses: Identify what the deck does well and where it struggles.
    {matchup_instruction}
       - Estimated Win Rate Pre-sideboard and Post-sideboard (express as integer percentage 0-100, e.g. 45).
       - Key cards the opponent plays that threaten this deck.
       - Sideboard Guide: EXACTLY which cards to bring IN from sideboard and take OUT from main deck.
    4. Suggested Changes: Recommend specific card swaps to improve the deck. Only suggest legal cards in {format_name}.
    5. Deck Scores: Rate this deck on 6 dimensions from 1 (very low) to 10 (exceptional):
       - speed: How fast can the deck win? (1 = very slow control, 10 = turn 1-2 combo/aggro)
       - consistency: How reliably does it execute its game plan? (1 = highly inconsistent, 10 = very consistent)
       - aggression: How proactively does it apply pressure? (1 = pure reactive, 10 = relentless aggro)
       - resilience: How well does it recover from disruption and removal? (1 = fragile, 10 = very resilient)
       - interaction: How much does it interact with the opponent's game plan? (1 = no interaction, 10 = full of answers)
       - combo_potential: How combo-oriented is the deck? (1 = pure fair magic, 10 = all-in combo)

    Rules:
    - NEVER suggest or reference banned cards.
    - Only use real, existing Magic: The Gathering card names. If unsure, omit.
    - win_rate_pre and win_rate_post must be integers between 0 and 100.
    - All scores must be integers between 1 and 10.

    The output language for all text fields MUST be: {locale}.

    You MUST return a JSON object with exactly this structure:
    {{
        "mana_curve_analysis": "Text analysis of the mana curve...",
        "strengths": ["Strength 1", "Strength 2", ...],
        "weaknesses": ["Weakness 1", "Weakness 2", ...],
        "matchups": [
            {{
                "archetype": "Deck Name",
                "win_rate_pre": 45,
                "win_rate_post": 55,
                "key_cards_opponent": ["Card A", "Card B"],
                "strategy": "Specific strategic advice...",
                "sideboard_in": [{{"card_name": "Card From Sideboard", "quantity": 2}}],
                "sideboard_out": [{{"card_name": "Card From Main", "quantity": 2}}]
            }},
            ...
        ],
        "suggested_changes": [
            {{"card_out": "Card Name", "card_in": "Card Name", "quantity": 1, "reason": "Why make this swap..."}},
            ...
        ],
        "general_summary": "Overall conclusion about the deck's viability.",
        "scores": {{
            "speed": 7,
            "consistency": 8,
            "aggression": 5,
            "resilience": 6,
            "interaction": 7,
            "combo_potential": 3
        }}
    }}
    """