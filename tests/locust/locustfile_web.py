"""
Locust load tests for mana-forge-web (Nginx/React SPA, default port 5173 dev / 80 prod).

User class:
  WebBrowserUser  — simulates a browser navigating SPA routes

The web service serves static files via Nginx in production, so these tests measure
static asset delivery performance, not API response times.

Run (dev server):
  locust -f locustfile_web.py --host http://localhost:5173
Run (production / Docker):
  locust -f locustfile_web.py --host http://localhost:80
  locust -f locustfile_web.py --host http://localhost:80 --headless -u 30 -r 5 -t 2m
"""

import random

from locust import HttpUser, between, task

_ROUTES = [
    "/",
    "/deck-explorer",
    "/formats",
    "/articles",
    "/my-decks",
    "/profile",
    "/dashboard",
]


class WebBrowserUser(HttpUser):
    """
    Simulates a user navigating through the React SPA.
    All routes serve the same index.html in production (client-side routing),
    so this primarily tests Nginx's static file delivery throughput.
    """

    wait_time = between(2, 6)

    @task(5)
    def home(self):
        self.client.get("/", name="/ (home)")

    @task(4)
    def deck_explorer(self):
        self.client.get("/deck-explorer", name="/deck-explorer")

    @task(3)
    def formats(self):
        self.client.get("/formats", name="/formats")

    @task(3)
    def articles(self):
        self.client.get("/articles", name="/articles")

    @task(2)
    def random_route(self):
        route = random.choice(_ROUTES)
        self.client.get(route, name=route)
