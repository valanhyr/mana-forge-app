#!/usr/bin/env python3
"""
Script para poblar Directus con datos reales de Strapi
Crea token de admin y carga formatos y artículos
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Configuración
DIRECTUS_URL = "http://localhost:9055"
DIRECTUS_API = f"{DIRECTUS_URL}"  # No usar /api
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin_password_change_me"

class DirectusClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.session = requests.Session()
    
    def login(self, email: str, password: str) -> bool:
        """Obtener token de admin"""
        print(f"🔐 Intentando login en Directus como {email}...")
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json={"email": email, "password": password},
                timeout=10
            )
            
            if response.status_code == 200:
                self.token = response.json()["data"]["access_token"]
                print(f"✅ Login exitoso!")
                return True
            else:
                print(f"❌ Error de login: {response.status_code}")
                print(response.text)
                return False
        except Exception as e:
            print(f"❌ Excepción durante login: {e}")
            return False
    
    def insert_item(self, collection: str, data: Dict[str, Any]) -> bool:
        """Insertar un item en una colección"""
        if not self.token:
            print("❌ No hay token autenticado")
            return False
        
        try:
            response = self.session.post(
                f"{self.base_url}/items/{collection}",
                json=data,
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                result = response.json()
                print(f"✅ Insertado en {collection}: {result['data'].get('id', result['data'].get('mongo_id'))}")
                return True
            else:
                print(f"❌ Error al insertar en {collection}: {response.status_code}")
                print(response.text)
                return False
        except Exception as e:
            print(f"❌ Excepción durante insert: {e}")
            return False
    
    def query_items(self, collection: str, filters: Optional[Dict] = None) -> list:
        """Consultar items de una colección"""
        if not self.token:
            print("❌ No hay token autenticado")
            return []
        
        try:
            params = {}
            if filters:
                # Construir filtros tipo Directus
                for key, value in filters.items():
                    params[f"filter[{key}][_eq]"] = value
            
            response = self.session.get(
                f"{self.base_url}/items/{collection}",
                headers={"Authorization": f"Bearer {self.token}"},
                params=params,
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()["data"]
            else:
                print(f"❌ Error al consultar {collection}: {response.status_code}")
                return []
        except Exception as e:
            print(f"❌ Excepción durante query: {e}")
            return []

def main():
    print("🚀 Directus Real Data Population")
    print("=" * 50)
    
    client = DirectusClient(DIRECTUS_URL)
    
    # 1. Login
    if not client.login(ADMIN_EMAIL, ADMIN_PASSWORD):
        print("\n❌ No se pudo autenticar en Directus")
        print("💡 Asegúrate de que Directus está corriendo en http://localhost:9055")
        sys.exit(1)
    
    # 2. Datos de Formatos
    print("\n📚 Cargando Formatos...")
    print("-" * 50)
    
    formats_data = [
        {
            "mongo_id": "6952904b81e73f1ce9fc9d18",
            "slug": "commander",
            "title": "Commander",
            "subtitle": "El formato multijugador por excelencia",
            "imageUrl": "https://api.scryfall.com/cards/named?exact=Urza%2C%20Lord%20Protector&format=image&version=art_crop",
            "description": {
                "name": "description",
                "title": "Descripción",
                "description": "Commander es una forma emocionante y única de jugar a Magic que se centra en criaturas legendarias impresionantes.",
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
                "description": "Premodern es un formato nostálgico que incluye todas las cartas desde el lanzamiento de Magic en 1993.",
                "rules": []
            },
            "rules": {
                "name": "rules",
                "title": "Reglas Principales",
                "description": None,
                "rules": [
                    {"id": 1, "text": "Mínimo 60 cartas en el mazo principal"},
                    {"id": 2, "text": "Hasta 15 cartas en el banquillo"}
                ]
            },
            "seo": None,
            "locale": "es"
        },
        {
            "mongo_id": "6952905a81e73f1ce9fc9d1b",
            "slug": "modern",
            "title": "Modern",
            "subtitle": "A format without rotation from Eighth Edition",
            "imageUrl": "https://api.scryfall.com/cards/named?exact=Ugin%27s%20Labyrinth&format=image&version=art_crop",
            "description": {
                "name": "description",
                "title": "Description",
                "description": "Modern is a constructed format that allows cards from Eighth Edition (2003) onwards.",
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
    
    for fmt in formats_data:
        client.insert_item("formats", fmt)
    
    # 3. Datos de Artículos
    print("\n📰 Cargando Artículos...")
    print("-" * 50)
    
    articles_data = [
        {
            "documentId": "dil69v0tu2nliozsuyij2d1n",
            "title": "MTG The Hobbit: An Unexpected Journey",
            "subtitle": "Explore the Adventure mechanic, Smaug's golden treasures, and full details on Magic's latest Middle-earth expansion.",
            "author": "Valanhyr",
            "content": '<p class="mb-4">The arrival of <strong>The Hobbit</strong> to Magic: The Gathering marks a milestone in the evolution of <em>Universes Beyond</em>.</p>\n\n<h3 class="text-xl font-bold text-white mt-6 mb-3">Mechanical Mastery: A True Narrative Journey</h3>\n<p class="mb-4">From a design perspective, the set shines through the triumphant return of the <strong>Adventure</strong> mechanic.</p>',
            "imageUrl": "https://cards.scryfall.io/art_crop/front/9/b/9b0d29a1-7da9-4fb3-8536-8ff8d8acae0b.jpg?1784376993",
            "publishedAt": "2026-08-16T15:13:43.303Z",
            "seo": None,
            "locale": "en"
        },
        {
            "documentId": "rc4x5y0inbxbnoopd3l2gyj9",
            "title": "Strixhaven: Academia de Magos",
            "subtitle": "Descubre las mecánicas, el Archivo Místico y todo lo que necesitas saber antes del estreno de la colección más mágica de Arcavios.",
            "author": "Valanhyr",
            "content": '<article>\n    <p class="mb-4">La llegada de <strong>Strixhaven: Academia de Magos</strong> no es simplemente una expansión más.</p>\n\n    <h3 class="text-xl font-bold text-white mt-6 mb-3">Historia y Trasfondo: El Conflicto en Arcavios</h3>\n    <p class="mb-4">La narrativa nos sitúa en un momento crítico.</p>',
            "imageUrl": "https://cards.scryfall.io/art_crop/front/7/7/77285d12-e658-4eb3-ba13-ff202afab9c8.jpg",
            "publishedAt": "2026-04-06T14:13:18.979Z",
            "seo": None,
            "locale": "es"
        }
    ]
    
    for article in articles_data:
        client.insert_item("articles", article)
    
    # 4. Verificar datos
    print("\n✅ Verificando datos cargados...")
    print("-" * 50)
    
    print("\n📚 Formatos en locale 'es':")
    formats_es = client.query_items("formats", {"locale": "es"})
    print(f"   Encontrados: {len(formats_es)} formatos")
    for fmt in formats_es:
        print(f"   • {fmt['title']} (slug: {fmt['slug']})")
    
    print("\n📚 Formatos en locale 'en':")
    formats_en = client.query_items("formats", {"locale": "en"})
    print(f"   Encontrados: {len(formats_en)} formatos")
    for fmt in formats_en:
        print(f"   • {fmt['title']} (slug: {fmt['slug']})")
    
    print("\n📰 Artículos en locale 'es':")
    articles_es = client.query_items("articles", {"locale": "es"})
    print(f"   Encontrados: {len(articles_es)} artículos")
    for art in articles_es:
        print(f"   • {art['title']} (por: {art['author']})")
    
    print("\n📰 Artículos en locale 'en':")
    articles_en = client.query_items("articles", {"locale": "en"})
    print(f"   Encontrados: {len(articles_en)} artículos")
    for art in articles_en:
        print(f"   • {art['title']} (por: {art['author']})")
    
    print("\n" + "=" * 50)
    print("✨ Población de datos completada!")
    print("\n🔗 URLs útiles:")
    print(f"   Admin: http://localhost:9055/admin/")
    print(f"   Formatos ES: http://localhost:9055/api/items/formats?filter[locale][_eq]=es")
    print(f"   Artículos EN: http://localhost:9055/api/items/articles?filter[locale][_eq]=en")

if __name__ == "__main__":
    main()
