"""Mana Forge Engine API"""
import logging
import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from routers import sideboard, analysis, random_deck

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("mana-forge-engine")

app = FastAPI(title="Mana Forge Engine", version="1.0.0")

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
