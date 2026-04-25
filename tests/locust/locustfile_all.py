"""
Combined full-stack Locust load test for all Mana Forge services.

This file imports all user classes from the per-service locustfiles and applies a
custom LoadTestShape that ramps traffic up, holds at peak, then ramps back down.

Each service must be reachable. Override hosts with env vars:
  API_HOST     — Spring Boot API    (default: http://localhost:8080)
  ENGINE_HOST  — FastAPI engine     (default: http://localhost:8000)
  WEB_HOST     — React/Nginx web    (default: http://localhost:5173)

Because Locust uses a single --host flag, this file patches each user class's
host attribute directly from env vars before the test starts.

Run:
  locust -f locustfile_all.py
  locust -f locustfile_all.py --headless -u 40 -r 4 -t 10m

Shape: 0 → 40 users over 2 min → hold 5 min → ramp down over 1 min → stop
"""

import os

from locust import LoadTestShape

from locustfile_api import AuthenticatedUser, BrowsingUser, DeckAnalysisUser
from locustfile_engine import AIUser, HealthCheckUser
from locustfile_web import WebBrowserUser

_API_HOST = os.getenv("API_HOST", "http://localhost:8080")
_ENGINE_HOST = os.getenv("ENGINE_HOST", "http://localhost:8000")
_WEB_HOST = os.getenv("WEB_HOST", "http://localhost:5173")

# Patch host on each user class so they hit the correct service.
BrowsingUser.host = _API_HOST
DeckAnalysisUser.host = _API_HOST
AuthenticatedUser.host = _API_HOST
HealthCheckUser.host = _ENGINE_HOST
AIUser.host = _ENGINE_HOST
WebBrowserUser.host = _WEB_HOST


class FullStackShape(LoadTestShape):
    """
    Ramp-up → hold → ramp-down load shape.

    Timeline (seconds):
      0  –  120 : ramp from 0 to 40 users
      120 – 420 : hold at 40 users
      420 – 480 : ramp down to 0
      480+      : stop
    """

    stages = [
        {"duration": 120, "users": 40, "spawn_rate": 2},
        {"duration": 420, "users": 40, "spawn_rate": 2},
        {"duration": 480, "users": 0, "spawn_rate": 5},
    ]

    def tick(self):
        run_time = self.get_run_time()
        for stage in self.stages:
            if run_time < stage["duration"]:
                return stage["users"], stage["spawn_rate"]
        return None
