import requests
import json

# Asegúrate de que el servidor esté corriendo en esta URL
url = "http://localhost:8000/v1/ai/analyze-deck"

# Mazo de ejemplo: Goblins (Premodern) con meta personalizado
payload = {
    "format_name": "Premodern",
    "locale": "es",
    "meta_archetypes": [
        "The Rock",
        "Psychatog",
        "Landstill",
        "Goblins",
        "Burn"
    ],
    "main_deck": [
        {"quantity": 3, "card_name": "Siege-Gang Commander"},
        {"quantity": 1, "card_name": "Goblin King"},
        {"quantity": 4, "card_name": "Goblin Matron"},
        {"quantity": 4, "card_name": "Goblin Warchief"},
        {"quantity": 4, "card_name": "Goblin Lackey"},
        {"quantity": 4, "card_name": "Gempalm Incinerator"},
        {"quantity": 4, "card_name": "Goblin Ringleader"},
        {"quantity": 1, "card_name": "Skirk Prospector"},
        {"quantity": 1, "card_name": "Goblin Sharpshooter"},
        {"quantity": 4, "card_name": "Goblin Piledriver"},
        {"quantity": 4, "card_name": "Mogg Fanatic"},
        {"quantity": 2, "card_name": "Naturalize"},
        {"quantity": 12, "card_name": "Mountain"},
        {"quantity": 3, "card_name": "Rishadan Port"},
        {"quantity": 4, "card_name": "Wooded Foothills"},
        {"quantity": 4, "card_name": "Karplusan Forest"},
        {"quantity": 1, "card_name": "Forest"}
    ],
    "sideboard": [
        {"quantity": 4, "card_name": "Pyroblast"},
        {"quantity": 2, "card_name": "Tranquil Domain"},
        {"quantity": 1, "card_name": "Goblin Tinkerer"},
        {"quantity": 2, "card_name": "Pyrokinesis"},
        {"quantity": 2, "card_name": "Naturalize"},
        {"quantity": 3, "card_name": "Tormod's Crypt"},
        {"quantity": 1, "card_name": "Threaten"}
    ]
}

print("Enviando petición de análisis con meta personalizado...")
try:
    response = requests.post(url, json=payload)
    response.raise_for_status()
    
    print("\n--- Respuesta de la IA ---")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'response') and e.response:
        print(f"Detalle del error: {e.response.text}")