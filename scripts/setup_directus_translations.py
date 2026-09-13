#!/usr/bin/env python3
"""Create Directus native Translations for formats and articles.

Leaves Strapi untouched. Safe to re-run: wipes formats/articles content.
Language codes are short (en, es, de, it, fr) so Accept-Language maps 1:1 later.
"""

from __future__ import annotations

import sys
from typing import Any

import requests

DIRECTUS_URL = "http://localhost:9055"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin_password_change_me"

LANGUAGES = [
    {"code": "en", "name": "English", "direction": "ltr"},
    {"code": "es", "name": "Spanish", "direction": "ltr"},
    {"code": "de", "name": "German", "direction": "ltr"},
    {"code": "it", "name": "Italian", "direction": "ltr"},
    {"code": "fr", "name": "French", "direction": "ltr"},
]

# Parent keeps identity/media; these move to *_translations.
FORMATS_STRIP = ["title", "subtitle", "description", "rules", "seo", "locale"]
ARTICLES_STRIP = ["title", "subtitle", "content", "article", "seo", "locale"]


class Directus:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.token: str | None = None

    def headers(self) -> dict[str, str]:
        return {"Authorization": f"Bearer {self.token}"}

    def login(self) -> None:
        print(f"Login as {ADMIN_EMAIL}...", end=" ")
        r = self.session.post(
            f"{self.base_url}/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=15,
        )
        r.raise_for_status()
        self.token = r.json()["data"]["access_token"]
        print("ok")

    def get(self, path: str, **kwargs: Any) -> requests.Response:
        return self.session.get(
            f"{self.base_url}{path}", headers=self.headers(), timeout=15, **kwargs
        )

    def post(self, path: str, json: Any) -> requests.Response:
        return self.session.post(
            f"{self.base_url}{path}", headers=self.headers(), json=json, timeout=30
        )

    def delete(self, path: str, json: Any | None = None) -> requests.Response:
        return self.session.delete(
            f"{self.base_url}{path}", headers=self.headers(), json=json, timeout=15
        )

    def collection_exists(self, name: str) -> bool:
        return self.get(f"/collections/{name}").status_code == 200

    def field_exists(self, collection: str, field: str) -> bool:
        return self.get(f"/fields/{collection}/{field}").status_code == 200

    def delete_field(self, collection: str, field: str) -> None:
        if not self.field_exists(collection, field):
            return
        r = self.delete(f"/fields/{collection}/{field}")
        if r.status_code in (200, 204):
            print(f"  removed {collection}.{field}")
        else:
            print(f"  skip {collection}.{field}: {r.status_code} {r.text[:200]}")

    def delete_all_items(self, collection: str, pk: str = "id") -> None:
        r = self.get(f"/items/{collection}", params={"fields": pk, "limit": -1})
        if r.status_code != 200:
            print(f"  no items in {collection} ({r.status_code})")
            return
        keys = [str(item[pk]) for item in r.json().get("data", [])]
        if not keys:
            print(f"  {collection} already empty")
            return
        dr = self.delete(f"/items/{collection}", json=keys)
        if dr.status_code in (200, 204):
            print(f"  deleted {len(keys)} from {collection}")
        else:
            print(f"  failed delete {collection}: {dr.status_code} {dr.text[:300]}")

    def generate_translations(self, collection: str, fields: list[str], create_languages: bool) -> None:
        payload = {
            "collection": collection,
            "fields": fields,
            "createLanguagesCollection": create_languages,
            "languagesCollection": "languages",
        }
        r = self.post("/utils/translations/generate", payload)
        if r.status_code != 200:
            raise RuntimeError(f"generate {collection} failed: {r.status_code} {r.text}")
        print(f"  generate {collection}: {r.json().get('data')}")


def ensure_translations_schema(dx: Directus) -> None:
    print("\nSchema: native Translations")
    languages_ok = False
    if dx.collection_exists("languages"):
        fields = dx.get("/fields/languages").json()["data"]
        languages_ok = any(
            f.get("field") == "code" and (f.get("schema") or {}).get("is_primary_key")
            for f in fields
        )

    if not languages_ok:
        if dx.field_exists("formats", "translations"):
            dx.delete("/fields/formats/translations")
        if dx.collection_exists("formats_translations"):
            dx.delete("/collections/formats_translations")
        if dx.field_exists("articles", "translations"):
            dx.delete("/fields/articles/translations")
        if dx.collection_exists("articles_translations"):
            dx.delete("/collections/articles_translations")
        if dx.collection_exists("languages"):
            dx.delete("/collections/languages")

    if not dx.field_exists("formats", "translations"):
        dx.generate_translations(
            "formats",
            ["title", "subtitle", "description", "rules", "seo"],
            create_languages=True,
        )
    else:
        print("  formats.translations already exists")

    if not dx.field_exists("articles", "translations"):
        dx.generate_translations(
            "articles",
            ["title", "subtitle", "content", "seo"],
            create_languages=False,
        )
    else:
        print("  articles.translations already exists")

    print("\nStrip duplicated fields from parent collections")
    for field in FORMATS_STRIP:
        dx.delete_field("formats", field)
    for field in ARTICLES_STRIP:
        dx.delete_field("articles", field)


def seed_languages(dx: Directus) -> None:
    print("\nLanguages: short codes en/es/de/it/fr")
    dx.delete_all_items("languages", pk="code")
    for lang in LANGUAGES:
        r = dx.post("/items/languages", lang)
        if r.status_code in (200, 201):
            print(f"  + {lang['code']} {lang['name']}")
        else:
            print(f"  fail {lang['code']}: {r.status_code} {r.text[:200]}")


def main() -> None:
    print("Directus Translations setup")
    print("=" * 60)
    dx = Directus(DIRECTUS_URL)
    try:
        dx.login()
    except Exception as exc:
        print(f"auth failed: {exc}")
        sys.exit(1)

    ensure_translations_schema(dx)
    print("\nWipe existing content (FK-safe before replacing languages)")
    for collection in ("formats_translations", "articles_translations", "formats", "articles"):
        if dx.collection_exists(collection):
            dx.delete_all_items(collection)
    seed_languages(dx)
    print("\nDone. Next: python scripts/populate_directus_translations.py")


if __name__ == "__main__":
    main()
