import logging
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from schemas.deck_schemas import SideboardRequest, SideboardResponse, DeckAnalysisRequest, DeckAnalysisResponse
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
    return {"status": "ok", "service": "mana-forge-engine"}

@app.post("/v1/ai/suggest-sideboard", response_model=SideboardResponse)
async def suggest_sideboard(request: SideboardRequest):
    logger.info(f"Received sideboard request for format: {request.format_name} ({request.locale})")
    logger.info(f"Deck size: {sum(c.quantity for c in request.main_deck)} cards")

    try:
        result = ai_service.suggest_sideboard(request.main_deck, request.format_name, request.locale)
        return result
    except Exception as e:
        logger.error(f"Failed to generate sideboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating AI suggestions")

@app.post("/v1/ai/analyze-deck", response_model=DeckAnalysisResponse)
async def analyze_deck(request: DeckAnalysisRequest):
    logger.info(f"Received deck analysis request for format: {request.format_name} ({request.locale})")
    
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
        logger.error(f"Failed to analyze deck: {str(e)}")
        raise HTTPException(status_code=500, detail="Error generating AI analysis")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)