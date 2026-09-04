#!/bin/bash

# Script para insertar datos reales en Directus
# Los datos vienen del archivo .json.md con ejemplos reales de Strapi

DIRECTUS_URL="http://localhost:9055/api"
TOKEN="${DIRECTUS_TOKEN:-your_admin_token_here}"

echo "🔧 Directus Real Data Population Script"
echo "=====================================\n"

# Función para insertar datos con manejo de errores
insert_data() {
    local collection=$1
    local data=$2
    echo "📝 Insertando en $collection..."
    
    response=$(curl -s -X POST "$DIRECTUS_URL/items/$collection" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "$data")
    
    if echo "$response" | grep -q '"data"'; then
        echo "✅ Insertado exitosamente"
        echo "$response" | jq '.'
    else
        echo "❌ Error al insertar"
        echo "$response" | jq '.'
    fi
    echo ""
}

# ==========================================
# 1. FORMATOS - Commander (ES)
# ==========================================
COMMANDER_ES='{
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
    "description": null,
    "rules": [
      {"id": 29, "text": "1 carta de Comandante (Criatura Legendaria)"},
      {"id": 30, "text": "99 cartas en el mazo principal"},
      {"id": 31, "text": "Solo una copia de cada carta (excepto tierras básicas)"},
      {"id": 32, "text": "Todas las cartas deben compartir la identidad de color del comandante"},
      {"id": 33, "text": "Las partidas suelen ser de 4 jugadores todos contra todos"},
      {"id": 34, "text": "Empiezas con 40 vidas"}
    ]
  },
  "seo": null,
  "locale": "es"
}'

insert_data "formats" "$COMMANDER_ES"

# ==========================================
# 2. FORMATOS - Premodern (ES)
# ==========================================
PREMODERN_ES='{
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
    "description": null,
    "rules": [
      {"id": 1, "text": "Mínimo 60 cartas en el mazo principal"},
      {"id": 2, "text": "Hasta 15 cartas en el banquillo"}
    ]
  },
  "seo": null,
  "locale": "es"
}'

insert_data "formats" "$PREMODERN_ES"

# ==========================================
# 3. FORMATOS - Modern (EN)
# ==========================================
MODERN_EN='{
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
    "description": null,
    "rules": [
      {"id": 39, "text": "Minimum 60 cards in main deck"},
      {"id": 40, "text": "Up to 15 cards in sideboard"},
      {"id": 41, "text": "Maximum 4 copies of each card (except basic lands)"},
      {"id": 42, "text": "No set rotation, but there is a banned list"}
    ]
  },
  "seo": null,
  "locale": "en"
}'

insert_data "formats" "$MODERN_EN"

# ==========================================
# 4. ARTICULOS - The Hobbit (EN)
# ==========================================
HOBBIT_EN='{
  "documentId": "dil69v0tu2nliozsuyij2d1n",
  "title": "MTG The Hobbit: An Unexpected Journey",
  "subtitle": "Explore the Adventure mechanic, Smaug'\''s golden treasures, and full details on Magic'\''s latest Middle-earth expansion.",
  "author": "Valanhyr",
  "content": "<p class=\"mb-4\">The arrival of <strong>The Hobbit</strong> to Magic: The Gathering marks a milestone in the evolution of <em>Universes Beyond</em>.</p>\n\n<h3 class=\"text-xl font-bold text-white mt-6 mb-3\">Mechanical Mastery: A True Narrative Journey</h3>\n<p class=\"mb-4\">From a design perspective, the set shines through the triumphant return of the <strong>Adventure</strong> mechanic.</p>",
  "imageUrl": "https://cards.scryfall.io/art_crop/front/9/b/9b0d29a1-7da9-4fb3-8536-8ff8d8acae0b.jpg?1784376993",
  "publishedAt": "2026-08-16T15:13:43.303Z",
  "seo": null,
  "locale": "en"
}'

insert_data "articles" "$HOBBIT_EN"

# ==========================================
# 5. ARTICULOS - Strixhaven (ES)
# ==========================================
STRIXHAVEN_ES='{
  "documentId": "rc4x5y0inbxbnoopd3l2gyj9",
  "title": "Strixhaven: Academia de Magos",
  "subtitle": "Descubre las mecánicas, el Archivo Místico y todo lo que necesitas saber antes del estreno de la colección más mágica de Arcavios.",
  "author": "Valanhyr",
  "content": "<article>\n    <p class=\"mb-4\">La llegada de <strong>Strixhaven: Academia de Magos</strong> no es simplemente una expansión más.</p>\n\n    <h3 class=\"text-xl font-bold text-white mt-6 mb-3\">Historia y Trasfondo: El Conflicto en Arcavios</h3>\n    <p class=\"mb-4\">La narrativa nos sitúa en un momento crítico.</p>",
  "imageUrl": "https://cards.scryfall.io/art_crop/front/7/7/77285d12-e658-4eb3-ba13-ff202afab9c8.jpg",
  "publishedAt": "2026-04-06T14:13:18.979Z",
  "seo": null,
  "locale": "es"
}'

insert_data "articles" "$STRIXHAVEN_ES"

echo "✨ Población de datos completada!"
echo "\nPróximos pasos:"
echo "1. Accede a http://localhost:9055/admin/"
echo "2. Verifica que los datos estén en Collections > formats y Collections > articles"
echo "3. Prueba las queries API:"
echo "   GET /api/items/formats?filter[locale][_eq]=es"
echo "   GET /api/items/articles?filter[locale][_eq]=en&sort=-publishedAt"
