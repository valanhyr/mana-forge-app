"""
Locust load tests for mana-forge-api (Spring Boot, default port 8080).

User classes:
  BrowsingUser        (weight=6) — anonymous GET requests; represents the majority of traffic
  DeckAnalysisUser    (weight=2) — public POST endpoints that proxy AI calls (no auth required)
  AuthenticatedUser   (weight=2) — session-based login flow + authenticated endpoints

Run:
  locust -f locustfile_api.py --host http://localhost:8080
  locust -f locustfile_api.py --host http://localhost:8080 --headless -u 20 -r 2 -t 2m
"""

import json
import os
import random
from pathlib import Path

from faker import Faker
from locust import HttpUser, between, events, tag, task

fake = Faker()

_FIXTURE_PATH = Path(__file__).parent / "fixtures" / "sample_deck.json"
_SAMPLE_DECK = json.loads(_FIXTURE_PATH.read_text())

_CARD_PREFIXES = ["Goblin", "Lightning", "Force", "Dark", "Sol", "Black", "Serra", "Fire", "Counter"]
_DECK_NAME_PREFIXES = ["Sligh", "Goblins", "Stompy", "Pox", "Enchantress", "Elves", "Mono"]


class BrowsingUser(HttpUser):
    """Simulates an anonymous visitor browsing the platform."""

    weight = 6
    wait_time = between(1, 4)

    @task(3)
    def list_formats(self):
        self.client.get("/api/formats", name="/api/formats")

    @task(2)
    def list_active_formats(self):
        self.client.get("/api/formats/active", name="/api/formats/active")

    @task(4)
    def autocomplete_card(self):
        prefix = random.choice(_CARD_PREFIXES)
        self.client.get(f"/api/cards/autocomplete?q={prefix}", name="/api/cards/autocomplete")

    @task(3)
    def scryfall_search(self):
        prefix = random.choice(_CARD_PREFIXES)
        self.client.get(f"/api/cards/scryfall?q={prefix}", name="/api/cards/scryfall")

    @task(3)
    def search_decks(self):
        term = random.choice(_DECK_NAME_PREFIXES)
        self.client.get(f"/api/decks/search?name={term}", name="/api/decks/search")

    @task(2)
    def featured_deck(self):
        self.client.get(
            "/api/decks/featured",
            headers={"Accept-Language": "en"},
            name="/api/decks/featured",
        )

    @task(2)
    def latest_articles(self):
        self.client.get(
            "/api/articles/latest",
            headers={"Accept-Language": "en"},
            name="/api/articles/latest",
        )

    @task(1)
    def premodern_banned_cards(self):
        self.client.get("/api/premodern/banned-cards", name="/api/premodern/banned-cards")


class DeckAnalysisUser(HttpUser):
    """
    Simulates users that trigger the AI-powered public endpoints.
    These proxy requests to mana-forge-engine (Groq Cloud), so use low concurrency.
    """

    weight = 2
    wait_time = between(8, 20)

    @task(3)
    def analyze_deck(self):
        payload = {
            "main_deck": _SAMPLE_DECK["main_deck"],
            "sideboard": _SAMPLE_DECK["sideboard"],
            "format_name": _SAMPLE_DECK["format_name"],
            "locale": _SAMPLE_DECK["locale"],
        }
        self.client.post(
            "/api/decks/analyze",
            json=payload,
            name="/api/decks/analyze",
        )

    @task(2)
    def deck_scores(self):
        payload = {
            "main_deck": _SAMPLE_DECK["main_deck"],
            "format_name": _SAMPLE_DECK["format_name"],
            "locale": _SAMPLE_DECK["locale"],
        }
        self.client.post(
            "/api/decks/scores",
            json=payload,
            name="/api/decks/scores",
        )

    @task(1)
    def random_deck(self):
        payload = {"format_name": "Premodern", "locale": "en"}
        self.client.post(
            "/api/decks/random",
            json=payload,
            name="/api/decks/random",
        )


class AuthenticatedUser(HttpUser):
    """
    Simulates a logged-in user. Requires TEST_USERNAME and TEST_PASSWORD env vars.
    On start: performs a session login and reuses the cookie for subsequent requests.
    """

    weight = 2
    wait_time = between(2, 6)

    _username = os.getenv("TEST_USERNAME", "testuser")
    _password = os.getenv("TEST_PASSWORD", "testpassword")

    def on_start(self):
        """Login once and store userId for later tasks."""
        self._user_id = None
        response = self.client.post(
            "/api/users/login",
            json={"username": self._username, "password": self._password},
            name="/api/users/login [setup]",
        )
        if response.status_code == 200:
            data = response.json()
            self._user_id = data.get("userId")

    @task(4)
    def get_me(self):
        self.client.get("/api/users/me", name="/api/users/me")

    @task(3)
    def get_my_decks(self):
        if self._user_id:
            self.client.get(
                f"/api/decks/user/{self._user_id}",
                name="/api/decks/user/{userId}",
            )

    @task(2)
    def get_following(self):
        self.client.get("/api/follows/following", name="/api/follows/following")

    @task(2)
    def get_unread_count(self):
        self.client.get("/api/messages/unread-count", name="/api/messages/unread-count")
