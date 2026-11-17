"""Mana Forge Engine API"""
import asyncio
import logging
import os
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from routers import sideboard, analysis, random_deck

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("mana-forge-engine")


app = FastAPI(title="Mana Forge Engine", version="1.0.0")

# Concurrency guard: the engine is reached through the Spring Boot proxy, which
# is the layer that enforces quota and Turnstile. This semaphore is the last
# line of defence — it stops a burst from opening 50 simultaneous provider
# calls and blowing through the Groq/Gemini rate limit (which costs retries and,
# eventually, a hard 429 from the provider for everyone).
_MAX_CONCURRENT_AI = max(1, int(os.environ.get("AI_MAX_CONCURRENT_REQUESTS", "4")))
_ai_semaphore = asyncio.Semaphore(_MAX_CONCURRENT_AI)
logger.info("AI concurrency limit: %s in-flight requests", _MAX_CONCURRENT_AI)


@app.middleware("http")
async def limit_ai_concurrency(request: Request, call_next):
    """Rejects excess concurrent AI work with 429 instead of queueing forever.

    Quota and Turnstile live in the Spring Boot proxy; this only guarantees the
    engine itself never exceeds the provider's concurrency limits.
    """
    if not request.url.path.startswith("/v1/ai/"):
        return await call_next(request)

    # Fail fast when every slot is busy, instead of piling up requests that each
    # hold a connection for 60s+. `locked()` + `acquire()` is safe here: when the
    # semaphore is free, acquire() returns without awaiting, so no other request
    # can slip in between the check and the take.
    if _ai_semaphore.locked():
        logger.warning("AI concurrency limit reached, rejecting request to %s", request.url.path)
        return JSONResponse(
            status_code=429,
            content={"detail": "AI engine is busy, retry shortly"},
            headers={"Retry-After": "5"},
        )

    await _ai_semaphore.acquire()
    try:
        return await call_next(request)
    finally:
        _ai_semaphore.release()
_raw_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://localhost:8080")
_allowed_origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sideboard.router)
app.include_router(analysis.router)
app.include_router(random_deck.router)


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "mana-forge-engine"}


if __name__ == "__main__":
    _dev = os.environ.get("ENV", "production").lower() == "development"
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=_dev)
