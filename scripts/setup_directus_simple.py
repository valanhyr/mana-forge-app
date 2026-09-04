#!/usr/bin/env python3
"""
Script para crear colecciones en Directus sin usar el YAML
Usa los endpoints correctos: /collections (sin /api)
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
        """Autenticarse en Directus"""
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
                print(f"❌ ({response.status_code})")
                return False
        except Exception as e:
            print(f"❌ {e}")
            return False
    
    def create_collection(self, name: str, note: str = "") -> bool:
        """Crear una colección básica"""
        print(f"📝 Creando colección '{name}'...", end=" ")
        try:
            payload = {
                "collection": name,
                "schema": {
                    "name": name
                },
                "meta": {
                    "collection": name,
                    "note": note,
                    "hidden": False,
                    "singleton": False,
                    "accountability": None
                }
            }
            
            response = self.session.post(
                f"{self.base_url}/collections",
                json=payload,
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                print("✅")
                return True
            else:
                print(f"❌ ({response.status_code})")
                if response.text:
                    try:
                        err = response.json()
                        if "errors" in err:
                            print(f"     Error: {err['errors'][0]['message']}")
                    except:
                        pass
                return False
        except Exception as e:
            print(f"❌ {e}")
            return False
    
    def create_field(self, collection: str, field_name: str, field_type: str, **kwargs) -> bool:
        """Crear un campo en una colección"""
        try:
            payload = {
                "field": field_name,
                "type": field_type,
                "meta": kwargs.get("meta", {}),
                "schema": kwargs.get("schema", {})
            }
            
            response = self.session.post(
                f"{self.base_url}/fields/{collection}",
                json=payload,
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                return True
            elif response.status_code == 422:
                # Ya existe, no es error
                return True
            else:
                return False
        except Exception as e:
            return False

def main():
    print("🚀 Directus Collections Setup")
    print("=" * 50 + "\n")
    
    mgr = DirectusManager(DIRECTUS_URL)
    
    if not mgr.login(ADMIN_EMAIL, ADMIN_PASSWORD):
        print("\n❌ Error de autenticación")
        sys.exit(1)
    
    print("\n📋 Creando colecciones...")
    print("-" * 50)
    
    # Crear colecciones
    collections = [
        ("formats", "MTG Card format definitions (Commander, Premodern, etc)"),
        ("articles", "Blog articles and content"),
        ("footer", "Website footer configuration"),
        ("footer_legal", "Footer legal links"),
        ("heros", "Hero sections for pages"),
        ("sections", "Content sections"),
        ("languages", "Supported languages")
    ]
    
    for name, note in collections:
        mgr.create_collection(name, note)
    
    print("\n📝 Creando campos para 'formats'...")
    print("-" * 50)
    
    formats_fields = [
        ("mongo_id", "string", {"meta": {"note": "MongoDB format ID"}}),
        ("slug", "string", {"meta": {"note": "URL-safe identifier"}}),
        ("title", "string", {}),
        ("subtitle", "string", {}),
        ("imageUrl", "string", {"meta": {"note": "Scryfall image URL"}}),
        ("description", "json", {"meta": {"note": "Description object with name, title, description, rules"}}),
        ("rules", "json", {"meta": {"note": "Rules object with array of {id, text}"}}),
        ("seo", "json", {"meta": {"note": "SEO metadata"}}),
        ("locale", "string", {"meta": {"note": "Language locale (en, es, pt, fr)"}}),
    ]
    
    for field_name, field_type, kwargs in formats_fields:
        if mgr.create_field("formats", field_name, field_type, **kwargs):
            print(f"  ✅ {field_name} ({field_type})")
        else:
            print(f"  ⚠️  {field_name}")
    
    print("\n📝 Creando campos para 'articles'...")
    print("-" * 50)
    
    articles_fields = [
        ("documentId", "string", {"meta": {"note": "Strapi document ID"}}),
        ("title", "string", {}),
        ("subtitle", "string", {}),
        ("author", "string", {"meta": {"note": "Author username"}}),
        ("content", "text", {"meta": {"note": "Article HTML content"}}),
        ("article", "text", {"meta": {"note": "Alias for content"}}),
        ("imageUrl", "string", {}),
        ("publishedAt", "timestamp", {}),
        ("seo", "json", {"meta": {"note": "SEO metadata"}}),
        ("locale", "string", {"meta": {"note": "Language locale"}}),
    ]
    
    for field_name, field_type, kwargs in articles_fields:
        if mgr.create_field("articles", field_name, field_type, **kwargs):
            print(f"  ✅ {field_name} ({field_type})")
        else:
            print(f"  ⚠️  {field_name}")
    
    print("\n✨ Setup completado!")
    print("\nProximo: python scripts/populate_directus_data.py")

if __name__ == "__main__":
    main()
