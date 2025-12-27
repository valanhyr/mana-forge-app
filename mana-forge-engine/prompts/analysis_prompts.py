from typing import List, Optional

def get_analysis_system_prompt() -> str:
    return "You are a Magic: The Gathering expert and professional deck builder. You provide deep strategic analysis and output only valid JSON."

def get_analysis_user_prompt(main_deck_str: str, sideboard_str: str, format_name: str, locale: str, archetypes: Optional[List[str]] = None) -> str:
    
    if archetypes and len(archetypes) > 0:
        archetypes_str = ", ".join(archetypes)
        matchup_instruction = f"3. Matchup Analysis: From the following list of current Tier 1 decks, select the 5 most relevant/difficult matchups: {archetypes_str}. For each of these 5, provide:"
    else:
        matchup_instruction = f"3. Matchup Analysis: Select the top 5 Tier 1 decks in {format_name} (based on general metagame knowledge). For each, provide:"

    return f"""
    Act as a Magic: The Gathering expert specializing in the {format_name} format.
    Perform a comprehensive analysis of the following deck.

    Main Deck:
    {main_deck_str}

    Sideboard:
    {sideboard_str}

    Your analysis must include:
    1. Mana Curve Analysis: Evaluate if the mana curve fits the archetype.
    2. Strengths & Weaknesses: Identify what the deck does well and where it struggles against the current Tier 1 meta.
    {matchup_instruction}
       - Estimated Win Rate (Pre & Post sideboard).
       - Sideboard Guide: EXACTLY which cards to take OUT from Main Deck and IN from Sideboard.
    4. Suggested Changes: Recommend specific card swaps to improve the deck list itself.

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
                "sideboard_in": [{{ "card_name": "Card From Sideboard", "quantity": 2 }}],
                "sideboard_out": [{{ "card_name": "Card From Main", "quantity": 2 }}]
            }},
            ...
        ],
        "suggested_changes": [
            {{ "card_out": "Card Name", "card_in": "Card Name", "quantity": 1, "reason": "Why make this swap..." }},
            ...
        ],
        "general_summary": "Overall conclusion about the deck's viability."
    }}
    """