"""
Locust load tests for mana-forge-engine (FastAPI, default port 8000).

User classes:
  HealthCheckUser  (weight=3) — lightweight GET /health probes
  AIUser           (weight=1) — AI POST endpoints (analyze, scores, sideboard, random deck)

⚠️  AIUser tasks call Groq Cloud (Llama 3.3). Use low user counts and long wait times to avoid
    rate-limit errors. Skip them in CI by running only HealthCheckUser:
      locust -f locustfile_engine.py --host http://localhost:8000 --tags health

Run:
  locust -f locustfile_engine.py --host http://localhost:8000
  locust -f locustfile_engine.py --host http://localhost:8000 --headless -u 5 -r 1 -t 2m
"""

import json
from pathlib import Path

from locust import HttpUser, between, tag, task

_FIXTURE_PATH = Path(__file__).parent / "fixtures" / "sample_deck.json"
_SAMPLE_DECK = json.loads(_FIXTURE_PATH.read_text())


class HealthCheckUser(HttpUser):
    """Lightweight probe to verify the engine is alive and responsive."""

    weight = 3
    wait_time = between(1, 3)

    @tag("health")
    @task
    def health(self):
        with self.client.get("/health", name="/health", catch_response=True) as resp:
            if resp.status_code == 200:
                body = resp.json()
                if body.get("status") != "ok":
                    resp.failure(f"Unexpected health body: {body}")
            else:
                resp.failure(f"Health check returned {resp.status_code}")


class AIUser(HttpUser):
    """
    Exercises all four AI endpoints. Uses long wait times to stay within Groq rate limits.
    Keep concurrency low (1–3 users) when running against a live Groq-backed engine.
    """

    weight = 1
    wait_time = between(10, 25)

    @tag("ai")
    @task(3)
    def analyze_deck(self):
        payload = {
            "main_deck": _SAMPLE_DECK["main_deck"],
            "sideboard": _SAMPLE_DECK["sideboard"],
            "format_name": _SAMPLE_DECK["format_name"],
            "locale": _SAMPLE_DECK["locale"],
        }
        self.client.post("/v1/ai/analyze-deck", json=payload, name="/v1/ai/analyze-deck")

    @tag("ai")
    @task(3)
    def deck_scores(self):
        payload = {
            "main_deck": _SAMPLE_DECK["main_deck"],
            "format_name": _SAMPLE_DECK["format_name"],
            "locale": _SAMPLE_DECK["locale"],
        }
        self.client.post("/v1/ai/deck-scores", json=payload, name="/v1/ai/deck-scores")

    @tag("ai")
    @task(2)
    def suggest_sideboard(self):
        payload = {
            "main_deck": _SAMPLE_DECK["main_deck"],
            "format_name": _SAMPLE_DECK["format_name"],
            "locale": _SAMPLE_DECK["locale"],
        }
        self.client.post("/v1/ai/suggest-sideboard", json=payload, name="/v1/ai/suggest-sideboard")

    @tag("ai")
    @task(1)
    def generate_random_deck(self):
        payload = {"format_name": "Premodern", "locale": "en"}
        self.client.post(
            "/v1/ai/generate-random-deck", json=payload, name="/v1/ai/generate-random-deck"
        )
