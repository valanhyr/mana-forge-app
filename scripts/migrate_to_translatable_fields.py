#!/usr/bin/env python3
"""
Script para reconfigurar colecciones con Translatable Fields
y repoblar con estructura traducida
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

DIRECTUS_URL = "http://localhost:9055"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin_password_change_me"

class DirectusManager:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.session = requests.Session()
    
    def login(self, email: str, password: str) -> bool:
        """Autenticarse"""
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
    
    def update_field_translatable(self, collection: str, field: str, translatable: bool = True) -> bool:
        """Marcar un campo como translatable"""
        try:
            payload = {
                "meta": {
                    "translations": translatable
                }
            }
            
            response = self.session.patch(
                f"{self.base_url}/fields/{collection}/{field}",
                json=payload,
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            
            return response.status_code in [200, 201]
        except Exception as e:
            return False
    
    def delete_all_items(self, collection: str) -> bool:
        """Eliminar todos los items"""
        try:
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
                print(f"  ✅ {result.get('slug', result.get('documentId', result.get('id')))}")
                return True
            else:
                print(f"  ❌ Error {response.status_code}")
                if response.text:
                    try:
                        print(f"     {response.json()['errors']}")
                    except:
                        pass
                return False
        except Exception as e:
            print(f"  ❌ {e}")
            return False

def main():
    print("🌍 Directus Translatable Fields Migration")
    print("=" * 60)
    
    mgr = DirectusManager(DIRECTUS_URL)
    
    if not mgr.login(ADMIN_EMAIL, ADMIN_PASSWORD):
        print("\n❌ Error de autenticación")
        sys.exit(1)
    
    # ==========================================
    # 1. MARCAR CAMPOS COMO TRANSLATABLE
    # ==========================================
    print("\n🔧 Configurando campos como Translatable...")
    print("-" * 60)
    
    translatable_fields = {
        "formats": ["title", "subtitle", "description", "rules"],
        "articles": ["title", "subtitle", "content"]
    }
    
    for collection, fields in translatable_fields.items():
        print(f"\n{collection}:")
        for field in fields:
            print(f"  {field}...", end=" ")
            if mgr.update_field_translatable(collection, field, True):
                print("✅")
            else:
                print("⚠️ (continuamos)")
    
    # ==========================================
    # 2. LIMPIAR DATOS ANTERIORES
    # ==========================================
    print("\n🗑️  Eliminando datos anteriores...")
    print("-" * 60)
    
    for collection in ["formats", "articles"]:
        print(f"  {collection}...", end=" ")
        if mgr.delete_all_items(collection):
            print("✅")
        else:
            print("⚠️")
    
    # ==========================================
    # 3. INSERTAR FORMATOS CON TRADUCCIÓN
    # ==========================================
    print("\n📚 Insertando Formatos con Translatable Fields...")
    print("-" * 60)
    
    formats_data = [
        {
            "mongo_id": "6952904b81e73f1ce9fc9d18",
            "slug": "commander",
            "title": {
                "en": "Commander",
                "es": "Commander"
            },
            "subtitle": {
                "en": "The ultimate multiplayer format",
                "es": "El formato multijugador por excelencia"
            },
            "imageUrl": "https://api.scryfall.com/cards/named?exact=Urza%2C%20Lord%20Protector&format=image&version=art_crop",
            "description": {
                "en": {
                    "name": "description",
                    "title": "Description",
                    "description": "Commander is an exciting and unique way to play Magic that focuses on impressive legendary creatures as the centerpiece of your deck.",
                    "rules": []
                },
                "es": {
                    "name": "description",
                    "title": "Descripción",
                    "description": "Commander es una forma emocionante y única de jugar a Magic que se centra en criaturas legendarias impresionantes como el corazón de tu mazo.",
                    "rules": []
                }
            },
            "rules": {
                "en": {
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
                "es": {
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
                }
            },
            "seo": None
        },
        {
            "mongo_id": "694b0558356c45d645b2e425",
            "slug": "premodern",
            "title": {
                "en": "Premodern",
                "es": "Premodern"
            },
            "subtitle": {
                "en": "Magic the way it used to be (1995-2003)",
                "es": "Magic como solía ser (1995-2003)"
            },
            "imageUrl": "https://api.scryfall.com/cards/named?exact=Spiritmonger&format=image&version=art_crop",
            "description": {
                "en": {
                    "name": "description",
                    "title": "Description",
                    "description": "Premodern is a nostalgic format that includes all cards from Magic's launch in 1993 through the end of the 2002 calendar year.",
                    "rules": []
                },
                "es": {
                    "name": "description",
                    "title": "Descripción",
                    "description": "Premodern es un formato nostálgico que incluye todas las cartas desde el lanzamiento de Magic en 1993 hasta finales de 2002.",
                    "rules": []
                }
            },
            "rules": {
                "en": {
                    "name": "rules",
                    "title": "Main Rules",
                    "description": None,
                    "rules": [
                        {"id": 1, "text": "Minimum 60 cards in main deck"},
                        {"id": 2, "text": "Up to 15 cards in sideboard"},
                        {"id": 3, "text": "Maximum 4 copies of each card (except basic lands)"}
                    ]
                },
                "es": {
                    "name": "rules",
                    "title": "Reglas Principales",
                    "description": None,
                    "rules": [
                        {"id": 1, "text": "Mínimo 60 cartas en el mazo principal"},
                        {"id": 2, "text": "Hasta 15 cartas en el banquillo"},
                        {"id": 3, "text": "Máximo 4 copias de cada carta (excepto tierras básicas)"}
                    ]
                }
            },
            "seo": None
        },
        {
            "mongo_id": "6952905a81e73f1ce9fc9d1b",
            "slug": "modern",
            "title": {
                "en": "Modern",
                "es": "Modern"
            },
            "subtitle": {
                "en": "A format without rotation from Eighth Edition onwards",
                "es": "Un formato sin rotación desde Eighth Edition en adelante"
            },
            "imageUrl": "https://api.scryfall.com/cards/named?exact=Ugin%27s%20Labyrinth&format=image&version=art_crop",
            "description": {
                "en": {
                    "name": "description",
                    "title": "Description",
                    "description": "Modern is a constructed format that allows cards from Eighth Edition (2003) onwards. It's one of Magic's most popular competitive formats.",
                    "rules": []
                },
                "es": {
                    "name": "description",
                    "title": "Descripción",
                    "description": "Modern es un formato construido que permite cartas desde Eighth Edition (2003) en adelante. Es uno de los formatos competitivos más populares de Magic.",
                    "rules": []
                }
            },
            "rules": {
                "en": {
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
                "es": {
                    "name": "rules",
                    "title": "Reglas Principales",
                    "description": None,
                    "rules": [
                        {"id": 39, "text": "Mínimo 60 cartas en el mazo principal"},
                        {"id": 40, "text": "Hasta 15 cartas en el banquillo"},
                        {"id": 41, "text": "Máximo 4 copias de cada carta (excepto tierras básicas)"},
                        {"id": 42, "text": "No hay rotación de conjuntos, pero existe una lista de prohibidas"}
                    ]
                }
            },
            "seo": None
        }
    ]
    
    for fmt in formats_data:
        mgr.insert_item("formats", fmt)
    
    # ==========================================
    # 4. INSERTAR ARTÍCULOS CON TRADUCCIÓN
    # ==========================================
    print("\n📰 Insertando Artículos con Translatable Fields...")
    print("-" * 60)
    
    articles_data = [
        {
            "documentId": "dil69v0tu2nliozsuyij2d1n",
            "title": {
                "en": "MTG The Hobbit: An Unexpected Journey",
                "es": "MTG El Hobbit: Un Viaje Inesperado"
            },
            "subtitle": {
                "en": "Explore the Adventure mechanic, Smaug's golden treasures, and full details on Magic's latest Middle-earth expansion.",
                "es": "Explora la mecánica de Aventura, los tesoros dorados de Smaug, y todos los detalles de la última expansión de Tierra Media de Magic."
            },
            "author": "Valanhyr",
            "content": {
                "en": '<p class="mb-4">The arrival of <strong>The Hobbit</strong> to Magic: The Gathering marks a milestone in the evolution of <em>Universes Beyond</em>.</p>\n\n<h3 class="text-xl font-bold text-white mt-6 mb-3">Mechanical Mastery: A True Narrative Journey</h3>\n<p class="mb-4">From a design perspective, the set shines through the triumphant return of the <strong>Adventure</strong> mechanic, which perfectly encapsulates the spirit of Tolkien\'s world.</p>',
                "es": '<p class="mb-4">La llegada de <strong>El Hobbit</strong> a Magic: The Gathering marca un hito en la evolución de <em>Universos Más Allá</em>.</p>\n\n<h3 class="text-xl font-bold text-white mt-6 mb-3">Maestría Mecánica: Un Viaje Narrativo Verdadero</h3>\n<p class="mb-4">Desde una perspectiva de diseño, el conjunto brilla con el regreso triunfante de la mecánica de <strong>Aventura</strong>, que encapsula perfectamente el espíritu del mundo de Tolkien.</p>'
            },
            "imageUrl": "https://cards.scryfall.io/art_crop/front/9/b/9b0d29a1-7da9-4fb3-8536-8ff8d8acae0b.jpg?1784376993",
            "publishedAt": "2026-08-16T15:13:43.303Z",
            "seo": None
        },
        {
            "documentId": "abc123def456ghi789jkl000",
            "title": {
                "en": "A Deep Dive into Premodern Meta",
                "es": "Un Análisis Profundo del Meta de Premodern"
            },
            "subtitle": {
                "en": "Analyzing the current state of competitive Premodern with tournament results and deck lists.",
                "es": "Analizando el estado actual del Premodern competitivo con resultados de torneo y listas de mazos."
            },
            "author": "Valanhyr",
            "content": {
                "en": '<p class="mb-4">Premodern has experienced significant growth in the competitive scene over the past year.</p>\n\n<h3 class="text-xl font-bold text-white mt-6 mb-3">The Current Meta Landscape</h3>\n<p class="mb-4">Blue-based control decks continue to dominate the format, with <strong>Counterspell</strong> and <strong>Mana Drain</strong> forming the backbone of many successful lists.</p>',
                "es": '<p class="mb-4">Premodern ha experimentado un crecimiento significativo en la escena competitiva durante el último año.</p>\n\n<h3 class="text-xl font-bold text-white mt-6 mb-3">El Panorama Actual del Meta</h3>\n<p class="mb-4">Los mazos de control basados en azul continúan dominando el formato, con <strong>Counterspell</strong> y <strong>Mana Drain</strong> formando la columna vertebral de muchas listas exitosas.</p>'
            },
            "imageUrl": "https://cards.scryfall.io/art_crop/front/a/a/aae0ff52-b470-4f00-9aab-0efada98afe6.jpg",
            "publishedAt": "2026-07-20T10:30:00.000Z",
            "seo": None
        },
        {
            "documentId": "rc4x5y0inbxbnoopd3l2gyj9",
            "title": {
                "en": "Strixhaven: School of Mages",
                "es": "Strixhaven: Academia de Magos"
            },
            "subtitle": {
                "en": "Discover the mechanics, the Mystical Archive, and everything you need to know before the release of the most magical collection of Arcavios.",
                "es": "Descubre las mecánicas, el Archivo Místico y todo lo que necesitas saber antes del estreno de la colección más mágica de Arcavios."
            },
            "author": "Valanhyr",
            "content": {
                "en": '<article>\n    <p class="mb-4">The arrival of <strong>Strixhaven: School of Mages</strong> is not just another expansion. It\'s a celebration of educational magic and academic competition.</p>\n    \n    <h3 class="text-xl font-bold text-white mt-6 mb-3">Background: The Conflict in Arcavios</h3>\n    <p class="mb-4">The narrative places us at a critical moment where Strixhaven students must unite to face an existential threat.</p>\n</article>',
                "es": '<article>\n    <p class="mb-4">La llegada de <strong>Strixhaven: Academia de Magos</strong> no es simplemente una expansión más. Es una celebración de la magia educativa y la competencia académica.</p>\n    \n    <h3 class="text-xl font-bold text-white mt-6 mb-3">Trasfondo: El Conflicto en Arcavios</h3>\n    <p class="mb-4">La narrativa nos sitúa en un momento crítico donde los estudiantes de Strixhaven deben unirse para enfrentar una amenaza existencial.</p>\n</article>'
            },
            "imageUrl": "https://cards.scryfall.io/art_crop/front/7/7/77285d12-e658-4eb3-ba13-ff202afab9c8.jpg",
            "publishedAt": "2026-04-06T14:13:18.979Z",
            "seo": None
        }
    ]
    
    for article in articles_data:
        mgr.insert_item("articles", article)
    
    # ==========================================
    # 5. RESUMEN FINAL
    # ==========================================
    print("\n" + "=" * 60)
    print("✨ Translatable Fields Migration Completada!")
    print("=" * 60)
    print("\n📊 Datos cargados:")
    print("  • 3 Formatos (con EN + ES integrados)")
    print("  • 3 Artículos (con EN + ES integrados)")
    print("  • TOTAL: 6 items únicos (sin duplicación)")
    print("\n🌐 Estructura:")
    print("  {")
    print('    "slug": "commander",')
    print('    "title": {"en": "Commander", "es": "Commander"},')
    print('    "subtitle": {"en": "...", "es": "..."},')
    print('    "description": {"en": {...}, "es": {...}},')
    print('    "rules": {"en": {...}, "es": {...}}')
    print("  }")
    print("\n🔗 Queries:")
    print("  GET /items/formats")
    print("  GET /items/articles")
    print("\n💡 Acceder campo traducido:")
    print('  formats[0]["title"]["es"]  ← Español')
    print('  formats[0]["title"]["en"]  ← Inglés')

if __name__ == "__main__":
    main()
