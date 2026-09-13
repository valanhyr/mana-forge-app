#!/usr/bin/env python3
"""Load one formats/articles row per document, with EN + ES translations.

Does not touch Strapi. Requires: python scripts/setup_directus_translations.py
"""

from __future__ import annotations

import sys
from typing import Any

import requests

DIRECTUS_URL = "http://localhost:9055"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin_password_change_me"


FORMATS = [
    {
        "mongo_id": "6952904b81e73f1ce9fc9d18",
        "slug": "commander",
        "imageUrl": "https://api.scryfall.com/cards/named?exact=Urza%2C%20Lord%20Protector&format=image&version=art_crop",
        "translations": [
            {
                "languages_code": "en",
                "title": "Commander",
                "subtitle": "The ultimate multiplayer format",
                "description": {
                    "name": "description",
                    "title": "Description",
                    "description": "Commander is an exciting and unique way to play Magic that focuses on impressive legendary creatures as the centerpiece of your deck.",
                    "rules": [],
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
                        {"id": 34, "text": "Start with 40 life"},
                    ],
                },
            },
            {
                "languages_code": "es",
                "title": "Commander",
                "subtitle": "El formato multijugador por excelencia",
                "description": {
                    "name": "description",
                    "title": "Descripción",
                    "description": "Commander es una forma emocionante y única de jugar a Magic que se centra en criaturas legendarias impresionantes como el corazón de tu mazo.",
                    "rules": [],
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
                        {"id": 34, "text": "Empiezas con 40 vidas"},
                    ],
                },
            },
        ],
    },
    {
        "mongo_id": "694b0558356c45d645b2e425",
        "slug": "premodern",
        "imageUrl": "https://api.scryfall.com/cards/named?exact=Spiritmonger&format=image&version=art_crop",
        "translations": [
            {
                "languages_code": "en",
                "title": "Premodern",
                "subtitle": "Magic the way it used to be (1995-2003)",
                "description": {
                    "name": "description",
                    "title": "Description",
                    "description": "Premodern is a nostalgic format that includes all cards from Magic's launch in 1993 through the end of the 2002 calendar year.",
                    "rules": [],
                },
                "rules": {
                    "name": "rules",
                    "title": "Main Rules",
                    "description": None,
                    "rules": [
                        {"id": 1, "text": "Minimum 60 cards in main deck"},
                        {"id": 2, "text": "Up to 15 cards in sideboard"},
                        {"id": 3, "text": "Maximum 4 copies of each card (except basic lands)"},
                    ],
                },
            },
            {
                "languages_code": "es",
                "title": "Premodern",
                "subtitle": "Magic como solía ser (1995-2003)",
                "description": {
                    "name": "description",
                    "title": "Descripción",
                    "description": "Premodern es un formato nostálgico que incluye todas las cartas desde el lanzamiento de Magic en 1993 hasta finales de 2002.",
                    "rules": [],
                },
                "rules": {
                    "name": "rules",
                    "title": "Reglas Principales",
                    "description": None,
                    "rules": [
                        {"id": 1, "text": "Mínimo 60 cartas en el mazo principal"},
                        {"id": 2, "text": "Hasta 15 cartas en el banquillo"},
                        {"id": 3, "text": "Máximo 4 copias de cada carta (excepto tierras básicas)"},
                    ],
                },
            },
        ],
    },
    {
        "mongo_id": "6952905a81e73f1ce9fc9d1b",
        "slug": "modern",
        "imageUrl": "https://api.scryfall.com/cards/named?exact=Ugin%27s%20Labyrinth&format=image&version=art_crop",
        "translations": [
            {
                "languages_code": "en",
                "title": "Modern",
                "subtitle": "A format without rotation from Eighth Edition onwards",
                "description": {
                    "name": "description",
                    "title": "Description",
                    "description": "Modern is a constructed format that allows cards from Eighth Edition (2003) onwards. It's one of Magic's most popular competitive formats.",
                    "rules": [],
                },
                "rules": {
                    "name": "rules",
                    "title": "Main Rules",
                    "description": None,
                    "rules": [
                        {"id": 39, "text": "Minimum 60 cards in main deck"},
                        {"id": 40, "text": "Up to 15 cards in sideboard"},
                        {"id": 41, "text": "Maximum 4 copies of each card (except basic lands)"},
                        {"id": 42, "text": "No set rotation, but there is a banned list"},
                    ],
                },
            },
            {
                "languages_code": "es",
                "title": "Modern",
                "subtitle": "Un formato sin rotación desde Eighth Edition en adelante",
                "description": {
                    "name": "description",
                    "title": "Descripción",
                    "description": "Modern es un formato construido que permite cartas desde Eighth Edition (2003) en adelante. Es uno de los formatos competitivos más populares de Magic.",
                    "rules": [],
                },
                "rules": {
                    "name": "rules",
                    "title": "Reglas Principales",
                    "description": None,
                    "rules": [
                        {"id": 39, "text": "Mínimo 60 cartas en el mazo principal"},
                        {"id": 40, "text": "Hasta 15 cartas en el banquillo"},
                        {"id": 41, "text": "Máximo 4 copias de cada carta (excepto tierras básicas)"},
                        {"id": 42, "text": "No hay rotación de conjuntos, pero existe una lista de prohibidas"},
                    ],
                },
            },
        ],
    },
]

ARTICLES = [
    {
        "documentId": "dil69v0tu2nliozsuyij2d1n",
        "author": "Valanhyr",
        "imageUrl": "https://cards.scryfall.io/art_crop/front/9/b/9b0d29a1-7da9-4fb3-8536-8ff8d8acae0b.jpg?1784376993",
        "publishedAt": "2026-08-16T15:13:43.303Z",
        "translations": [
            {
                "languages_code": "en",
                "title": "MTG The Hobbit: An Unexpected Journey",
                "subtitle": "Explore the Adventure mechanic, Smaug's golden treasures, and full details on Magic's latest Middle-earth expansion.",
                "content": (
                    '<p class="mb-4">The arrival of <strong>The Hobbit</strong> to Magic: The Gathering '
                    "marks a milestone in the evolution of <em>Universes Beyond</em>.</p>\n\n"
                    '<h3 class="text-xl font-bold text-white mt-6 mb-3">Mechanical Mastery: A True Narrative Journey</h3>\n'
                    '<p class="mb-4">From a design perspective, the set shines through the triumphant return of the '
                    "<strong>Adventure</strong> mechanic, which perfectly encapsulates the spirit of Tolkien's world.</p>\n\n"
                    '<p class="mb-4">Each adventure card tells a story within a story, allowing players to experience '
                    "multiple phases of danger and discovery.</p>"
                ),
            },
            {
                "languages_code": "es",
                "title": "MTG El Hobbit: Un Viaje Inesperado",
                "subtitle": "Explora la mecánica de Aventura, los tesoros dorados de Smaug, y todos los detalles de la última expansión de Tierra Media de Magic.",
                "content": (
                    '<p class="mb-4">La llegada de <strong>El Hobbit</strong> a Magic: The Gathering '
                    "marca un hito en la evolución de <em>Universos Más Allá</em>.</p>\n\n"
                    '<h3 class="text-xl font-bold text-white mt-6 mb-3">Maestría Mecánica: Un Viaje Narrativo Verdadero</h3>\n'
                    '<p class="mb-4">Desde una perspectiva de diseño, el conjunto brilla con el regreso triunfante de la '
                    "mecánica de <strong>Aventura</strong>, que encapsula perfectamente el espíritu del mundo de Tolkien.</p>\n\n"
                    '<p class="mb-4">Cada carta de aventura cuenta una historia dentro de otra historia, permitiendo a los '
                    "jugadores experimentar múltiples fases de peligro y descubrimiento.</p>"
                ),
            },
        ],
    },
    {
        "documentId": "abc123def456ghi789jkl000",
        "author": "Valanhyr",
        "imageUrl": "https://cards.scryfall.io/art_crop/front/a/a/aae0ff52-b470-4f00-9aab-0efada98afe6.jpg",
        "publishedAt": "2026-07-20T10:30:00.000Z",
        "translations": [
            {
                "languages_code": "en",
                "title": "A Deep Dive into Premodern Meta",
                "subtitle": "Analyzing the current state of competitive Premodern with tournament results and deck lists.",
                "content": (
                    '<p class="mb-4">Premodern has experienced significant growth in the competitive scene over the past year.</p>\n\n'
                    '<h3 class="text-xl font-bold text-white mt-6 mb-3">The Current Meta Landscape</h3>\n'
                    '<p class="mb-4">Blue-based control decks continue to dominate the format, with <strong>Counterspell</strong> '
                    "and <strong>Mana Drain</strong> forming the backbone of many successful lists.</p>\n\n"
                    '<p class="mb-4">However, aggressive strategies have found new tools and are making a resurgence in local tournaments.</p>'
                ),
            },
            {
                "languages_code": "es",
                "title": "Un Análisis Profundo del Meta de Premodern",
                "subtitle": "Analizando el estado actual del Premodern competitivo con resultados de torneo y listas de mazos.",
                "content": (
                    '<p class="mb-4">Premodern ha experimentado un crecimiento significativo en la escena competitiva durante el último año.</p>\n\n'
                    '<h3 class="text-xl font-bold text-white mt-6 mb-3">El Panorama Actual del Meta</h3>\n'
                    '<p class="mb-4">Los mazos de control basados en azul continúan dominando el formato, con <strong>Counterspell</strong> '
                    "y <strong>Mana Drain</strong> formando la columna vertebral de muchas listas exitosas.</p>\n\n"
                    '<p class="mb-4">Sin embargo, las estrategias agresivas han encontrado nuevas herramientas y están resurgiendo en torneos locales.</p>'
                ),
            },
        ],
    },
    {
        "documentId": "rc4x5y0inbxbnoopd3l2gyj9",
        "author": "Valanhyr",
        "imageUrl": "https://cards.scryfall.io/art_crop/front/7/7/77285d12-e658-4eb3-ba13-ff202afab9c8.jpg",
        "publishedAt": "2026-04-06T14:13:18.979Z",
        "translations": [
            {
                "languages_code": "en",
                "title": "Strixhaven: School of Mages",
                "subtitle": "Discover the mechanics, the Mystical Archive, and everything you need to know before the release of the most magical collection of Arcavios.",
                "content": (
                    "<article>\n"
                    '    <p class="mb-4">The arrival of <strong>Strixhaven: School of Mages</strong> is not just another expansion. '
                    "It's a celebration of educational magic and academic competition.</p>\n\n"
                    '    <h3 class="text-xl font-bold text-white mt-6 mb-3">Background: The Conflict in Arcavios</h3>\n'
                    '    <p class="mb-4">The narrative places us at a critical moment where Strixhaven students must unite to face an existential threat.</p>\n'
                    '    <p class="mb-4">The mechanics introduce new forms of color interaction and deck-building strategies.</p>\n'
                    "</article>"
                ),
            },
            {
                "languages_code": "es",
                "title": "Strixhaven: Academia de Magos",
                "subtitle": "Descubre las mecánicas, el Archivo Místico y todo lo que necesitas saber antes del estreno de la colección más mágica de Arcavios.",
                "content": (
                    "<article>\n"
                    '    <p class="mb-4">La llegada de <strong>Strixhaven: Academia de Magos</strong> no es simplemente una expansión más. '
                    "Es una celebración de la magia educativa y la competencia académica.</p>\n\n"
                    '    <h3 class="text-xl font-bold text-white mt-6 mb-3">Trasfondo: El Conflicto en Arcavios</h3>\n'
                    '    <p class="mb-4">La narrativa nos sitúa en un momento crítico donde los estudiantes de Strixhaven deben unirse para enfrentar una amenaza existencial.</p>\n'
                    '    <p class="mb-4">Las mecánicas introducen nuevas formas de interacción entre colores y estrategias de construcción de mazos.</p>\n'
                    "</article>"
                ),
            },
        ],
    },
]


class Directus:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.token: str | None = None

    def login(self) -> None:
        r = self.session.post(
            f"{self.base_url}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=15,
        )
        r.raise_for_status()
        self.token = r.json()["data"]["access_token"]

    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"}

    def delete_all(self, collection: str) -> None:
        r = self.session.get(
            f"{self.base_url}/items/{collection}",
            headers=self.headers(),
            params={"fields": "id", "limit": -1},
            timeout=15,
        )
        if r.status_code != 200:
            return
        keys = [str(item["id"]) for item in r.json().get("data", [])]
        if not keys:
            return
        self.session.delete(
            f"{self.base_url}/items/{collection}",
            headers=self.headers(),
            json=keys,
            timeout=15,
        )

    def insert(self, collection: str, data: dict[str, Any]) -> dict[str, Any]:
        r = self.session.post(
            f"{self.base_url}/items/{collection}",
            headers=self.headers(),
            json=data,
            params={"fields": "*,translations.*"},
            timeout=30,
        )
        if r.status_code not in (200, 201):
            raise RuntimeError(f"{collection} insert failed {r.status_code}: {r.text}")
        return r.json()["data"]


def main() -> None:
    print("Populate Directus translations (one row per document)")
    print("=" * 60)
    dx = Directus(DIRECTUS_URL)
    try:
        dx.login()
        print("Login ok")
    except Exception as exc:
        print(f"auth failed: {exc}")
        sys.exit(1)

    print("\nWipe formats/articles")
    for collection in ("formats_translations", "articles_translations", "formats", "articles"):
        dx.delete_all(collection)
        print(f"  {collection} cleared")

    print("\nFormats")
    for item in FORMATS:
        created = dx.insert("formats", item)
        langs = [t.get("languages_code") for t in created.get("translations") or []]
        print(f"  {created.get('slug')} id={created.get('id')} translations={langs}")

    print("\nArticles")
    for item in ARTICLES:
        created = dx.insert("articles", item)
        langs = [t.get("languages_code") for t in created.get("translations") or []]
        print(f"  {created.get('documentId')} id={created.get('id')} translations={langs}")

    print("\nHow Directus returns this")
    print("  All langs:   GET /items/formats?fields=*,translations.*")
    print("  Spanish:     GET /items/formats?fields=*,translations.*&deep[translations][_filter][languages_code][_eq]=es")
    print("  English:     GET /items/formats?fields=*,translations.*&deep[translations][_filter][languages_code][_eq]=en")
    print("  Admin:       http://localhost:9055/admin/")


if __name__ == "__main__":
    main()
