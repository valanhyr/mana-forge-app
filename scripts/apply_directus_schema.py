#!/usr/bin/env python3
"""
Script para aplicar el schema YAML a Directus
Carga el snapshot desde snapshots/directus_schema.yaml
"""

import requests
import json
import yaml
import sys
from pathlib import Path
from typing import Dict, Any, Optional

DIRECTUS_URL = "http://localhost:9055"
DIRECTUS_API = f"{DIRECTUS_URL}/api"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin_password_change_me"
SCHEMA_FILE = Path(__file__).parent.parent / "snapshots" / "directus_schema.yaml"

class DirectusSchemaManager:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.token: Optional[str] = None
        self.session = requests.Session()
    
    def login(self, email: str, password: str) -> bool:
        """Obtener token de admin"""
        print(f"🔐 Login a Directus como {email}...")
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json={"email": email, "password": password},
                timeout=10
            )
            
            if response.status_code == 200:
                self.token = response.json()["data"]["access_token"]
                print("✅ Login exitoso!")
                return True
            else:
                print(f"❌ Error de login: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Excepción: {e}")
            return False
    
    def load_schema_yaml(self) -> Optional[Dict]:
        """Cargar schema desde archivo YAML"""
        print(f"\n📂 Cargando schema desde {SCHEMA_FILE}...")
        
        if not SCHEMA_FILE.exists():
            print(f"❌ Archivo no encontrado: {SCHEMA_FILE}")
            return None
        
        try:
            with open(SCHEMA_FILE, 'r', encoding='utf-8') as f:
                schema = yaml.safe_load(f)
            
            print(f"✅ Schema cargado")
            return schema
        except Exception as e:
            print(f"❌ Error al cargar YAML: {e}")
            return None
    
    def get_collections(self) -> list:
        """Obtener lista de colecciones existentes"""
        try:
            response = self.session.get(
                f"{self.base_url}/api/collections",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                return response.json()["data"]
            return []
        except Exception as e:
            print(f"❌ Error al obtener colecciones: {e}")
            return []
    
    def create_collection(self, collection_config: Dict[str, Any]) -> bool:
        """Crear una colección"""
        try:
            collection_name = collection_config.get("collection")
            print(f"  📝 Creando colección '{collection_name}'...", end=" ")
            
            # Preparar payload para Directus
            payload = {
                "collection": collection_name,
                "meta": collection_config.get("meta", {}),
                "schema": collection_config.get("schema", {})
            }
            
            response = self.session.post(
                f"{self.base_url}/api/collections",
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
                        print(f"     {response.json()['errors']}")
                    except:
                        print(f"     {response.text}")
                return False
        except Exception as e:
            print(f"❌ Excepción: {e}")
            return False
    
    def create_field(self, collection: str, field_config: Dict[str, Any]) -> bool:
        """Crear un field en una colección"""
        try:
            field_name = field_config.get("field")
            
            # Preparar payload para Directus
            payload = {
                "field": field_name,
                "type": field_config.get("type"),
                "meta": field_config.get("meta", {}),
                "schema": field_config.get("schema", {})
            }
            
            response = self.session.post(
                f"{self.base_url}/api/fields/{collection}",
                json=payload,
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                return True
            else:
                # Si el campo ya existe, no es un error
                if response.status_code == 422:
                    return True
                return False
        except Exception as e:
            return False
    
    def apply_schema(self, schema: Dict) -> bool:
        """Aplicar el schema completo"""
        print("\n📋 Aplicando schema...")
        print("=" * 50)
        
        collections_data = schema.get("collections", [])
        
        # 1. Crear colecciones
        print("\n1️⃣  Creando colecciones:")
        created_collections = []
        for collection_config in collections_data:
            if self.create_collection(collection_config):
                created_collections.append(collection_config.get("collection"))
        
        print(f"   {len(created_collections)}/{len(collections_data)} colecciones creadas")
        
        # 2. Crear fields
        print("\n2️⃣  Creando fields:")
        total_fields = 0
        created_fields = 0
        
        for collection_config in collections_data:
            collection_name = collection_config.get("collection")
            fields = collection_config.get("fields", [])
            
            print(f"   {collection_name}:")
            for field_config in fields:
                total_fields += 1
                if self.create_field(collection_name, field_config):
                    created_fields += 1
                    print(f"      ✅ {field_config.get('field')}")
                else:
                    print(f"      ⚠️  {field_config.get('field')}")
        
        print(f"\n   {created_fields}/{total_fields} fields creados/actualizados")
        
        return True

def main():
    print("🚀 Directus Schema Application")
    print("=" * 50)
    
    manager = DirectusSchemaManager(DIRECTUS_URL)
    
    # 1. Login
    if not manager.login(ADMIN_EMAIL, ADMIN_PASSWORD):
        print("\n❌ No se pudo autenticar")
        sys.exit(1)
    
    # 2. Cargar schema
    schema = manager.load_schema_yaml()
    if not schema:
        print("\n❌ No se pudo cargar el schema")
        sys.exit(1)
    
    # 3. Aplicar schema
    if not manager.apply_schema(schema):
        print("\n❌ Error al aplicar schema")
        sys.exit(1)
    
    # 4. Verificar
    print("\n✅ Verificando colecciones creadas:")
    collections = manager.get_collections()
    for col in collections:
        print(f"   • {col['collection']}: {col.get('meta', {}).get('note', 'Sistema')}")
    
    print("\n" + "=" * 50)
    print("✨ Schema aplicado exitosamente!")
    print("\nProximo paso: Poblar datos con populate_directus_data.py")

if __name__ == "__main__":
    main()
