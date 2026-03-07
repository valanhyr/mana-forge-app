import logging
from fastapi import APIRouter, Depends, HTTPException
from schemas.deck_schemas import SideboardRequest, SideboardResponse
from services.ai_service import AIService
from services.dependencies import get_ai_service

router = APIRouter(prefix="/v1/ai", tags=["Sideboard"])
logger = logging.getLogger(__name__)


@router.post("/suggest-sideboard", response_model=SideboardResponse)
async def suggest_sideboard(
    request: SideboardRequest,
    service: AIService = Depends(get_ai_service),
):
    logger.info("Sideboard request — format: %s locale: %s cards: %d",
                request.format_name, request.locale, sum(c.quantity for c in request.main_deck))
    try:
        return await service.suggest_sideboard(request.main_deck, request.format_name, request.locale)
    except (ValueError, RuntimeError) as e:
        logger.error("Sideboard AI error: %s", e)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error("Sideboard unexpected error: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")
