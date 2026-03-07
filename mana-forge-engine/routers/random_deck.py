import logging
from fastapi import APIRouter, Depends, HTTPException
from schemas.deck_schemas import RandomDeckRequest, RandomDeckResponse
from services.ai_service import AIService
from services.dependencies import get_ai_service

router = APIRouter(prefix="/v1/ai", tags=["Random Deck"])
logger = logging.getLogger(__name__)


@router.post("/generate-random-deck", response_model=RandomDeckResponse)
async def generate_random_deck(
    request: RandomDeckRequest,
    service: AIService = Depends(get_ai_service),
):
    logger.info("Random deck request — format: %s locale: %s", request.format_name or "any", request.locale)
    try:
        return await service.generate_random_deck(locale=request.locale, format_name=request.format_name)
    except (ValueError, RuntimeError) as e:
        logger.error("Random deck AI error: %s", e)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error("Random deck unexpected error: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")
