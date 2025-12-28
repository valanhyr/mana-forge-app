import os
import json
import logging
from typing import List, Optional
from groq import Groq
from schemas.deck_schemas import SideboardResponse, CardInput, DeckAnalysisResponse, RandomDeckResponse
from prompts.sideboard_prompts import get_sideboard_system_prompt, get_sideboard_user_prompt
from prompts.analysis_prompts import get_analysis_system_prompt, get_analysis_user_prompt
from prompts.random_deck_prompts import get_random_deck_system_prompt, get_random_deck_user_prompt

logger = logging.getLogger(__name__)

# Datos estáticos del meta (esto podría venir de una base de datos en el futuro)
PREMODERN_META = [
    "Burn", "Stiflenought", "Goblins", "Oath", "Parallax Replenish", 
    "Enchantress", "Elves", "Devourer Combo", "Landstill", "Tide Control",
    "Madness", "Survival", "Terrageddon", "Stasis", "Reanimator"
]

class AIService:
    def __init__(self):
        api_key = os.environ.get("GROQ_API_KEY")
        if not api_key:
            logger.warning("GROQ_API_KEY not found in environment variables")
        
        self.client = Groq(api_key=api_key)
        self.model = "llama-3.3-70b-versatile"

    def suggest_sideboard(self, main_deck: list[CardInput], format_name: str, locale: str) -> SideboardResponse:
        # Formatear la lista de cartas para el prompt
        deck_str = "\n".join([f"{c.quantity} {c.name}" for c in main_deck])
        
        system_prompt = get_sideboard_system_prompt()
        user_prompt = get_sideboard_user_prompt(deck_str, format_name, locale)

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=self.model,
                temperature=0.5, # Balance entre creatividad y determinismo
                response_format={"type": "json_object"}, # Forzar salida JSON
            )

            content = chat_completion.choices[0].message.content
            data = json.loads(content)
            
            return SideboardResponse(**data)
            
        except Exception as e:
            logger.error(f"Error calling Groq API: {str(e)}")
            raise e

    def analyze_deck(self, main_deck: list[CardInput], sideboard: list[CardInput], format_name: str, locale: str, meta_archetypes: Optional[List[str]] = None) -> DeckAnalysisResponse:
        main_str = "\n".join([f"{c.quantity} {c.name}" for c in main_deck])
        side_str = "\n".join([f"{c.quantity} {c.name}" for c in sideboard]) if sideboard else "No Sideboard provided."
        
        # Si no se especifican arquetipos y es Premodern, usamos nuestra lista curada
        target_archetypes = meta_archetypes
        if not target_archetypes and format_name.lower() == "premodern":
            target_archetypes = PREMODERN_META

        system_prompt = get_analysis_system_prompt()
        user_prompt = get_analysis_user_prompt(main_str, side_str, format_name, locale, target_archetypes)

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=self.model,
                temperature=0.5,
                response_format={"type": "json_object"},
            )

            content = chat_completion.choices[0].message.content
            data = json.loads(content)
            
            return DeckAnalysisResponse(**data)
            
        except Exception as e:
            logger.error(f"Error calling Groq API for analysis: {str(e)}")
            raise e

    def generate_random_deck(self, locale: str, format_name: Optional[str] = None) -> RandomDeckResponse:
        system_prompt = get_random_deck_system_prompt()
        user_prompt = get_random_deck_user_prompt(locale, format_name)

        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                model=self.model,
                temperature=0.8, # Temperatura más alta para mayor creatividad en la generación
                response_format={"type": "json_object"},
            )

            content = chat_completion.choices[0].message.content
            data = json.loads(content)
            
            return RandomDeckResponse(**data)
            
        except Exception as e:
            logger.error(f"Error calling Groq API for random deck generation: {str(e)}")
            raise e