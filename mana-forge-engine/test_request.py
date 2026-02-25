import requests
import json

# Asegúrate de que el servidor esté corriendo en esta URL
url = "http://localhost:8000/v1/ai/suggest-sideboard"

# Mazo de ejemplo: Mono Red Burn (Premodern)
payload = {
    "format_name": "Premodern",
    "locale": "es",
    "main_deck": [
        {"card_name": "Mountain", "quantity": 20},
        {"card_name": "Lightning Bolt", "quantity": 4},
        {"card_name": "Jackal Pup", "quantity": 4},
        {"card_name": "Mogg Fanatic", "quantity": 4},
        {"card_name": "Grim Lavamancer", "quantity": 4},
        {"card_name": "Cursed Scroll", "quantity": 4},
        {"card_name": "Fireblast", "quantity": 4},
        {"card_name": "Incinerate", "quantity": 4},
        {"card_name": "Ball Lightning", "quantity": 4},
        {"card_name": "Price of Progress", "quantity": 4},
        {"card_name": "Wasteland", "quantity": 4}
    ]
}

print("Enviando petición a la IA...")
try:
    response = requests.post(url, json=payload)
    response.raise_for_status()
    
    print("\n--- Respuesta de la IA ---")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
except Exception as e:
    print(f"Error: {e}")
    if hasattr(e, 'response') and e.response:
        print(f"Detalle del error: {e.response.text}")