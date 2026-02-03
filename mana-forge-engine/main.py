"""Mana Forge Engine API"""
import logging
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from schemas.deck_schemas import SideboardRequest, SideboardResponse, DeckAnalysisRequest, DeckAnalysisResponse, RandomDeckRequest, RandomDeckResponse
from services.ai_service import AIService

# Cargar variables de entorno
load_dotenv()

# Configuración de Logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("mana-forge-engine")

app = FastAPI(title="Mana Forge Engine", version="1.0.0")

# Configurar CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, cambia esto por la URL de tu frontend
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ai_service = AIService()

@app.get("/health")
def health_check():
    """
    Health check endpoint for the Mana Forge Engine.

    Returns:
        dict: A simple JSON object indicating the service is running.
    """
    return {"status": "ok", "service": "mana-forge-engine"}

@app.post("/v1/ai/suggest-sideboard", response_model=SideboardResponse)
async def suggest_sideboard(request: SideboardRequest):
    """
    Endpoint to suggest a sideboard for a given main deck in a specific format.

    Args:
        request (SideboardRequest): Request body containing the main deck, format name, and locale.

    Returns:
        SideboardResponse: Suggested sideboard and reasoning provided by the AI.

    Raises:
        HTTPException: If AI sideboard suggestion fails or an internal error occurs.
    """
    logger.info("Received sideboard request for format: %s (%s)", request.format_name, request.locale)
    logger.info("Deck size: %s cards", sum(c.quantity for c in request.main_deck))

    try:
        result = ai_service.suggest_sideboard(request.main_deck, request.format_name, request.locale)
        return result
    except Exception as e:
        logger.error("Failed to generate sideboard: %s", str(e))
        raise HTTPException(status_code=500, detail="Error generating AI suggestions")
@app.post("/v1/ai/analyze-deck", response_model=DeckAnalysisResponse)
async def analyze_deck(request: DeckAnalysisRequest):
    logger.info("Received deck analysis request for format: %s (%s)", request.format_name, request.locale)
    
    try:
        result = ai_service.analyze_deck(
            request.main_deck,
            request.sideboard,
            request.format_name,
            request.locale,
            request.meta_archetypes
        )
        return result
    except Exception as e:
        logger.error("Failed to analyze deck: %s", str(e))
        raise HTTPException(status_code=500, detail="Error generating AI analysis")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

@app.post("/v1/ai/generate-random-deck", response_model=RandomDeckResponse)
async def generate_random_deck(request: RandomDeckRequest):
    """
    Endpoint to generate a complete, random, and competitive deck.
    The AI can choose a format or build for a specified one.

    Args:
        request (RandomDeckRequest): Request body containing the locale and an optional format name.

    Returns:
        RandomDeckResponse: A complete deck with name, format, strategy, and analysis.

    Raises:
        HTTPException: If AI random deck generation fails or an internal error occurs.
    """
    logger.info("Received random deck request for format: %s (%s)", request.format_name or 'any', request.locale)
    
    try:
        result = ai_service.generate_random_deck(locale=request.locale, format_name=request.format_name)
        return result
    except Exception as e:
        logger.error("Failed to generate random deck: %s", str(e))
        raise HTTPException(status_code=500, detail="Error generating AI random deck")