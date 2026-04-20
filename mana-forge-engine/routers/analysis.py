import logging
from fastapi import APIRouter, Depends, HTTPException
from schemas.deck_schemas import DeckAnalysisRequest, DeckAnalysisResponse, DeckScoresRequest, DeckScoresOnlyResponse
from services.ai_service import AIService
from services.dependencies import get_ai_service

router = APIRouter(prefix="/v1/ai", tags=["Analysis"])
logger = logging.getLogger(__name__)


@router.post("/analyze-deck", response_model=DeckAnalysisResponse)
async def analyze_deck(
    request: DeckAnalysisRequest,
    service: AIService = Depends(get_ai_service),
):
    logger.info("Analysis request — format: %s locale: %s", request.format_name, request.locale)
    try:
        return await service.analyze_deck(
            request.main_deck, request.sideboard,
            request.format_name, request.locale, request.meta_archetypes,
        )
    except (ValueError, RuntimeError) as e:
        logger.error("Analysis AI error: %s", e)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error("Analysis unexpected error: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/deck-scores", response_model=DeckScoresOnlyResponse)
async def deck_scores(
    request: DeckScoresRequest,
    service: AIService = Depends(get_ai_service),
):
    logger.info("Deck scores request — format: %s locale: %s", request.format_name, request.locale)
    try:
        return await service.get_deck_scores(request.main_deck, request.format_name, request.locale)
    except (ValueError, RuntimeError) as e:
        logger.error("Deck scores AI error: %s", e)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error("Deck scores unexpected error: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")

