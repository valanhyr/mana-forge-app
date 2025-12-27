def get_sideboard_system_prompt() -> str:
    return "You are a Magic: The Gathering expert and professional deck builder. You output only valid JSON."

def get_sideboard_user_prompt(deck_list_str: str, format_name: str, locale: str) -> str:
    return f"""
    Act as a Magic: The Gathering expert specializing in the {format_name} format.
    Analyze the current metagame for {format_name} (especially considering recent trends).
    
    Here is the Main Deck list:
    {deck_list_str}
    
    Your task is to suggest a 15-card Sideboard that covers the weaknesses of this Main Deck against the current meta.
    
    The output language for the 'reason' and 'analysis' fields MUST be: {locale}.
    
    You MUST return a JSON object with exactly this structure:
    {{
        "suggestions": [
            {{ "name": "Card Name", "quantity": 1, "reason": "Explanation of why this card is needed" }},
            ...
        ],
        "analysis": "A brief strategic analysis explaining how this sideboard complements the main deck's weaknesses."
    }}
    
    Ensure the total quantity of cards in 'suggestions' sums up to exactly 15.
    """
