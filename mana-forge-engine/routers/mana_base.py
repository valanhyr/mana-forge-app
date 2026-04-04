import logging
from fastapi import APIRouter, Depends, HTTPException
from schemas.deck_schemas import ManaBaseRequest, ManaBaseAnalysisResponse
from services.ai_service import AIService
from services.dependencies import get_ai_service

router = APIRouter(prefix="/v1/ai", tags=["Mana Base"])
logger = logging.getLogger(__name__)

@router.post("/optimize-mana-base", response_model=ManaBaseAnalysisResponse)
async def optimize_mana_base(
    request: ManaBaseRequest,
    service: AIService = Depends(get_ai_service),
):
    logger.info("Mana base request — format: %s target_level: %s",
                request.format_name, request.target_level)
    try:
        return await service.get_mana_base_recommendations(
            request.main_deck, 
            request.format_name, 
            request.locale,
            request.target_level
        )
    except (ValueError, RuntimeError) as e:
        logger.error("Mana base AI error: %s", e)
        raise HTTPException(status_code=502, detail=str(e))
    except Exception as e:
        logger.error("Mana base unexpected error: %s", e)
        raise HTTPException(status_code=500, detail="Internal server error")
