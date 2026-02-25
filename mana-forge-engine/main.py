"""Mana Forge Engine API"""
import logging
import os
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from schemas.deck_schemas import SideboardRequest, SideboardResponse, DeckAnalysisRequest, DeckAnalysisResponse, RandomDeckRequest, RandomDeckResponse
from services.ai_service import AIService

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

ai_service = AIService()


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "mana-forge-engine"}


@app.post("/v1/ai/suggest-sideboard", response_model=SideboardResponse)
async def suggest_sideboard(request: SideboardRequest):
    logger.info("Sideboard request — format: %s locale: %s cards: %s",
                request.format_name, request.locale, sum(c.quantity for c in request.main_deck))
    try:
        return ai_service.suggest_sideboard(request.main_deck, request.format_name, request.locale)
    except (ValueError, RuntimeError) as e:
        logger.error("Sideboard AI error: %s", e)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error("Sideboard unexpected error: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/v1/ai/analyze-deck", response_model=DeckAnalysisResponse)
async def analyze_deck(request: DeckAnalysisRequest):
    logger.info("Analysis request — format: %s locale: %s", request.format_name, request.locale)
    try:
        return ai_service.analyze_deck(
            request.main_deck, request.sideboard,
            request.format_name, request.locale, request.meta_archetypes
        )
    except (ValueError, RuntimeError) as e:
        logger.error("Analysis AI error: %s", e)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error("Analysis unexpected error: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@app.post("/v1/ai/generate-random-deck", response_model=RandomDeckResponse)
async def generate_random_deck(request: RandomDeckRequest):
    logger.info("Random deck request — format: %s locale: %s", request.format_name or "any", request.locale)
    try:
        return ai_service.generate_random_deck(locale=request.locale, format_name=request.format_name)
    except (ValueError, RuntimeError) as e:
        logger.error("Random deck AI error: %s", e)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error("Random deck unexpected error: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
