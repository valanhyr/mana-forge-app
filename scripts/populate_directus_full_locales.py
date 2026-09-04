#!/usr/bin/env python3
"""
Script para poblar Directus con datos reales EN + ES
Basado en ejemplos de Strapi del usuario
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

DIRECTUS_URL = "http://localhost:9055"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin_password_change_me"

class DirectusClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.session = requests.Session()
    
    def login(self, email: str, password: str) -> bool:
        """Obtener token de admin"""
        print(f"🔐 Login como {email}...", end=" ")
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json={"email": email, "password": password},
                timeout=10
            )
            
            if response.status_code == 200:
                self.token = response.json()["data"]["access_token"]
                print("✅")
                return True
            else:
                print(f"❌")
                return False
        except Exception as e:
            print(f"❌ {e}")
            return False
    
    def delete_all_items(self, collection: str) -> bool:
        """Eliminar todos los items de una colección"""
        try:
            # Primero obtener todos los IDs
            response = self.session.get(
                f"{self.base_url}/items/{collection}?fields=id",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            
            if response.status_code != 200:
                return False
            
            items = response.json()["data"]
            ids = [str(item["id"]) for item in items]
            
            if not ids:
                return True
            
            # Eliminar en lote
            del_response = self.session.delete(
                f"{self.base_url}/items/{collection}",
                json={"keys": ids},
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            
            return del_response.status_code in [200, 204]
        except Exception as e:
            return False
    
    def insert_item(self, collection: str, data: Dict[str, Any]) -> bool:
        """Insertar un item"""
        try:
            response = self.session.post(
                f"{self.base_url}/items/{collection}",
                json=data,
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                result = response.json()["data"]
                print(f"  ✅ {result.get('title', result.get('id'))}")
                return True
            else:
                print(f"  ❌ Error {response.status_code}")
                return False
        except Exception as e:
            print(f"  ❌ {e}")
            return False

def main():
    print("🚀 Directus Full EN/ES Data Population")
    print("=" * 60)
    
    client = DirectusClient(DIRECTUS_URL)
    
    if not client.login(ADMIN_EMAIL, ADMIN_PASSWORD):
        print("\n❌ Error de autenticación")
        sys.exit(1)
    
    # ==========================================
    # 1. LIMPIAR DATOS ANTERIORES
    # ==========================================
    print("\n🗑️  Limpiando datos anteriores...")
    print("-" * 60)
    
    for collection in ["formats", "articles"]:
        print(f"Eliminando items de '{collection}'...", end=" ")
        if client.delete_all_items(collection):
            print("✅")
        else:
            print("⚠️ (continúa)")
    
    # ==========================================
    # 2. FORMATOS EN INGLÉS
    # ==========================================
    print("\n📚 Formatos en INGLÉS...")
    print("-" * 60)
    
    formats_en = [
        {
            "mongo_id": "6952904b81e73f1ce9fc9d18",
            "slug": "commander",
            "title": "Commander",
            "subtitle": "The ultimate multiplayer format",
            "imageUrl": "https://api.scryfall.com/cards/named?exact=Urza%2C%20Lord%20Protector&format=image&version=art_crop",
            "description": {
                "name": "description",
                "title": "Description",
                "description": "Commander is an exciting and unique way to play Magic that focuses on impressive legendary creatures as the centerpiece of your deck.",
                "rules": []
            },
            "rules": {
                "name": "rules",
                "title": "Main Rules",
                "description": None,
                "rules": [
                    {"id": 29, "text": "1 Commander card (Legendary Creature)"},
                    {"id": 30, "text": "99 cards in main deck"},
                    {"id": 31, "text": "Maximum 1 copy of each card (except basic lands)"},
                    {"id": 32, "text": "All cards must share the commander's color identity"},
                    {"id": 33, "text": "Games are typically 4 players free-for-all"},
                    {"id": 34, "text": "Start with 40 life"}
                ]
            },
            "seo": None,
            "locale": "en"
        },
        {
            "mongo_id": "694b0558356c45d645b2e425",
            "slug": "premodern",
            "title": "Premodern",
            "subtitle": "Magic the way it used to be (1995-2003)",
            "imageUrl": "https://api.scryfall.com/cards/named?exact=Spiritmonger&format=image&version=art_crop",
            "description": {
                "name": "description",
                "title": "Description",
                "description": "Premodern is a nostalgic format that includes all cards from Magic's launch in 1993 through the end of the 2002 calendar year.",
                "rules": []
            },
            "rules": {
                "name": "rules",
                "title": "Main Rules",
                "description": None,
                "rules": [
                    {"id": 1, "text": "Minimum 60 cards in main deck"},
                    {"id": 2, "text": "Up to 15 cards in sideboard"},
                    {"id": 3, "text": "Maximum 4 copies of each card (except basic lands)"}
                ]
            },
            "seo": None,
            "locale": "en"
        },
        {
            "mongo_id": "6952905a81e73f1ce9fc9d1b",
            "slug": "modern",
            "title": "Modern",
            "subtitle": "A format without rotation from Eighth Edition onwards",
            "imageUrl": "https://api.scryfall.com/cards/named?exact=Ugin%27s%20Labyrinth&format=image&version=art_crop",
            "description": {
                "name": "description",
                "title": "Description",
                "description": "Modern is a constructed format that allows cards from Eighth Edition (2003) onwards. It's one of Magic's most popular competitive formats.",
                "rules": []
            },
            "rules": {
                "name": "rules",
                "title": "Main Rules",
                "description": None,
                "rules": [
                    {"id": 39, "text": "Minimum 60 cards in main deck"},
                    {"id": 40, "text": "Up to 15 cards in sideboard"},
                    {"id": 41, "text": "Maximum 4 copies of each card (except basic lands)"},
                    {"id": 42, "text": "No set rotation, but there is a banned list"}
                ]
            },
            "seo": None,
            "locale": "en"
        }
    ]
    
    for fmt in formats_en:
        client.insert_item("formats", fmt)
    
    # ==========================================
    # 3. FORMATOS EN ESPAÑOL
    # ==========================================
    print("\n📚 Formatos en ESPAÑOL...")
    print("-" * 60)
    
    formats_es = [
        {
            "mongo_id": "6952904b81e73f1ce9fc9d18",
            "slug": "commander",
            "title": "Commander",
            "subtitle": "El formato multijugador por excelencia",
            "imageUrl": "https://api.scryfall.com/cards/named?exact=Urza%2C%20Lord%20Protector&format=image&version=art_crop",
            "description": {
                "name": "description",
                "title": "Descripción",
                "description": "Commander es una forma emocionante y única de jugar a Magic que se centra en criaturas legendarias impresionantes como el corazón de tu mazo.",
                "rules": []
            },
            "rules": {
                "name": "rules",
                "title": "Reglas Principales",
                "description": None,
                "rules": [
                    {"id": 29, "text": "1 carta de Comandante (Criatura Legendaria)"},
                    {"id": 30, "text": "99 cartas en el mazo principal"},
                    {"id": 31, "text": "Solo una copia de cada carta (excepto tierras básicas)"},
                    {"id": 32, "text": "Todas las cartas deben compartir la identidad de color del comandante"},
                    {"id": 33, "text": "Las partidas suelen ser de 4 jugadores todos contra todos"},
                    {"id": 34, "text": "Empiezas con 40 vidas"}
                ]
            },
            "seo": None,
            "locale": "es"
        },
        {
            "mongo_id": "694b0558356c45d645b2e425",
            "slug": "premodern",
            "title": "Premodern",
            "subtitle": "Magic como solía ser (1995-2003)",
            "imageUrl": "https://api.scryfall.com/cards/named?exact=Spiritmonger&format=image&version=art_crop",
            "description": {
                "name": "description",
                "title": "Descripción",
                "description": "Premodern es un formato nostálgico que incluye todas las cartas desde el lanzamiento de Magic en 1993 hasta finales de 2002.",
                "rules": []
            },
            "rules": {
                "name": "rules",
                "title": "Reglas Principales",
                "description": None,
                "rules": [
                    {"id": 1, "text": "Mínimo 60 cartas en el mazo principal"},
                    {"id": 2, "text": "Hasta 15 cartas en el banquillo"},
                    {"id": 3, "text": "Máximo 4 copias de cada carta (excepto tierras básicas)"}
                ]
            },
            "seo": None,
            "locale": "es"
        },
        {
            "mongo_id": "6952905a81e73f1ce9fc9d1b",
            "slug": "modern",
            "title": "Modern",
            "subtitle": "Un formato sin rotación desde Eighth Edition en adelante",
            "imageUrl": "https://api.scryfall.com/cards/named?exact=Ugin%27s%20Labyrinth&format=image&version=art_crop",
            "description": {
                "name": "description",
                "title": "Descripción",
                "description": "Modern es un formato construido que permite cartas desde Eighth Edition (2003) en adelante. Es uno de los formatos competitivos más populares de Magic.",
                "rules": []
            },
            "rules": {
                "name": "rules",
                "title": "Reglas Principales",
                "description": None,
                "rules": [
                    {"id": 39, "text": "Mínimo 60 cartas en el mazo principal"},
                    {"id": 40, "text": "Hasta 15 cartas en el banquillo"},
                    {"id": 41, "text": "Máximo 4 copias de cada carta (excepto tierras básicas)"},
                    {"id": 42, "text": "No hay rotación de conjuntos, pero existe una lista de prohibidas"}
                ]
            },
            "seo": None,
            "locale": "es"
        }
    ]
    
    for fmt in formats_es:
        client.insert_item("formats", fmt)
    
    # ==========================================
    # 4. ARTÍCULOS EN INGLÉS
    # ==========================================
    print("\n📰 Artículos en INGLÉS...")
    print("-" * 60)
    
    articles_en = [
        {
            "documentId": "dil69v0tu2nliozsuyij2d1n",
            "title": "MTG The Hobbit: An Unexpected Journey",
            "subtitle": "Explore the Adventure mechanic, Smaug's golden treasures, and full details on Magic's latest Middle-earth expansion.",
            "author": "Valanhyr",
            "content": '<p class="mb-4">The arrival of <strong>The Hobbit</strong> to Magic: The Gathering marks a milestone in the evolution of <em>Universes Beyond</em>.</p>\n\n<h3 class="text-xl font-bold text-white mt-6 mb-3">Mechanical Mastery: A True Narrative Journey</h3>\n<p class="mb-4">From a design perspective, the set shines through the triumphant return of the <strong>Adventure</strong> mechanic, which perfectly encapsulates the spirit of Tolkien\'s world.</p>\n\n<p class="mb-4">Each adventure card tells a story within a story, allowing players to experience multiple phases of danger and discovery.</p>',
            "imageUrl": "https://cards.scryfall.io/art_crop/front/9/b/9b0d29a1-7da9-4fb3-8536-8ff8d8acae0b.jpg?1784376993",
            "publishedAt": "2026-08-16T15:13:43.303Z",
            "seo": None,
            "locale": "en"
        },
        {
            "documentId": "abc123def456ghi789jkl000",
            "title": "A Deep Dive into Premodern Meta",
            "subtitle": "Analyzing the current state of competitive Premodern with tournament results and deck lists.",
            "author": "Valanhyr",
            "content": '<p class="mb-4">Premodern has experienced significant growth in the competitive scene over the past year.</p>\n\n<h3 class="text-xl font-bold text-white mt-6 mb-3">The Current Meta Landscape</h3>\n<p class="mb-4">Blue-based control decks continue to dominate the format, with <strong>Counterspell</strong> and <strong>Mana Drain</strong> forming the backbone of many successful lists.</p>\n\n<p class="mb-4">However, aggressive strategies have found new tools and are making a resurgence in local tournaments.</p>',
            "imageUrl": "https://cards.scryfall.io/art_crop/front/a/a/aae0ff52-b470-4f00-9aab-0efada98afe6.jpg",
            "publishedAt": "2026-07-20T10:30:00.000Z",
            "seo": None,
            "locale": "en"
        }
    ]
    
    for article in articles_en:
        client.insert_item("articles", article)
    
    # ==========================================
    # 5. ARTÍCULOS EN ESPAÑOL
    # ==========================================
    print("\n📰 Artículos en ESPAÑOL...")
    print("-" * 60)
    
    articles_es = [
        {
            "documentId": "dil69v0tu2nliozsuyij2d1n",
            "title": "MTG El Hobbit: Un Viaje Inesperado",
            "subtitle": "Explora la mecánica de Aventura, los tesoros dorados de Smaug, y todos los detalles de la última expansión de Tierra Media de Magic.",
            "author": "Valanhyr",
            "content": '<p class="mb-4">La llegada de <strong>El Hobbit</strong> a Magic: The Gathering marca un hito en la evolución de <em>Universos Más Allá</em>.</p>\n\n<h3 class="text-xl font-bold text-white mt-6 mb-3">Maestría Mecánica: Un Viaje Narrativo Verdadero</h3>\n<p class="mb-4">Desde una perspectiva de diseño, el conjunto brilla con el regreso triunfante de la mecánica de <strong>Aventura</strong>, que encapsula perfectamente el espíritu del mundo de Tolkien.</p>\n\n<p class="mb-4">Cada carta de aventura cuenta una historia dentro de otra historia, permitiendo a los jugadores experimentar múltiples fases de peligro y descubrimiento.</p>',
            "imageUrl": "https://cards.scryfall.io/art_crop/front/9/b/9b0d29a1-7da9-4fb3-8536-8ff8d8acae0b.jpg?1784376993",
            "publishedAt": "2026-08-16T15:13:43.303Z",
            "seo": None,
            "locale": "es"
        },
        {
            "documentId": "rc4x5y0inbxbnoopd3l2gyj9",
            "title": "Strixhaven: Academia de Magos",
            "subtitle": "Descubre las mecánicas, el Archivo Místico y todo lo que necesitas saber antes del estreno de la colección más mágica de Arcavios.",
            "author": "Valanhyr",
            "content": '<article>\n    <p class="mb-4">La llegada de <strong>Strixhaven: Academia de Magos</strong> no es simplemente una expansión más. Es una celebración de la magia educativa y la competencia académica.</p>\n\n    <h3 class="text-xl font-bold text-white mt-6 mb-3">Historia y Trasfondo: El Conflicto en Arcavios</h3>\n    <p class="mb-4">La narrativa nos sitúa en un momento crítico donde los estudiantes de Strixhaven deben unirse para enfrentar una amenaza existencial.</p>\n    \n    <p class="mb-4">Las mecánicas introducen nuevas formas de interacción entre colores y estrategias de construcción de mazos.</p>\n</article>',
            "imageUrl": "https://cards.scryfall.io/art_crop/front/7/7/77285d12-e658-4eb3-ba13-ff202afab9c8.jpg",
            "publishedAt": "2026-04-06T14:13:18.979Z",
            "seo": None,
            "locale": "es"
        }
    ]
    
    for article in articles_es:
        client.insert_item("articles", article)
    
    # ==========================================
    # 6. RESUMEN FINAL
    # ==========================================
    print("\n" + "=" * 60)
    print("✨ Población completada!")
    print("=" * 60)
    print("\n📊 Datos cargados:")
    print("  • 3 Formatos EN + 3 Formatos ES = 6 items")
    print("  • 2 Artículos EN + 2 Artículos ES = 4 items")
    print("  • TOTAL: 10 items")
    print("\n🔗 URLs de prueba:")
    print("  Formatos EN: http://localhost:9055/items/formats?filter[locale][_eq]=en")
    print("  Formatos ES: http://localhost:9055/items/formats?filter[locale][_eq]=es")
    print("  Artículos EN: http://localhost:9055/items/articles?filter[locale][_eq]=en")
    print("  Artículos ES: http://localhost:9055/items/articles?filter[locale][_eq]=es")
    print("\n💡 Tip: Usa el admin http://localhost:9055/admin/ para visualizar los datos")

if __name__ == "__main__":
    main()
