"""Mana Forge Engine API"""
import logging
import os
import uvicorn
from contextlib import asynccontextmanager
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


def _setup_otel(fastapi_app: FastAPI) -> None:
    """Initialize OTel tracing only when OTEL_SDK_DISABLED != 'true'."""
    if os.environ.get("OTEL_SDK_DISABLED", "true").lower() == "true":
        return
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
    
    # Support both standard OTEL_* and Grafana-specific vars
    endpoint = os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT") or os.environ.get("GRAFANA_OTLP_ENDPOINT")
    if not endpoint:
        return
    
    headers = {}
    headers_raw = os.environ.get("OTEL_EXPORTER_OTLP_HEADERS", "")
    for part in headers_raw.split(","):
        if "=" in part:
            k, v = part.split("=", 1)
            headers[k.strip()] = v.strip()
    
    # If Grafana auth is provided, add Authorization header
    grafana_auth = os.environ.get("GRAFANA_OTLP_AUTH", "")
    if grafana_auth:
        headers["Authorization"] = f"Basic {grafana_auth}"
    
    provider = TracerProvider()
    provider.add_span_processor(
        BatchSpanProcessor(OTLPSpanExporter(endpoint=f"{endpoint}/v1/traces", headers=headers))
    )
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(fastapi_app)
    fastapi_app.state.otel_provider = provider
    logger.info("OpenTelemetry tracing initialized → %s", endpoint)


@asynccontextmanager
async def lifespan(fastapi_app: FastAPI):
    yield
    if hasattr(fastapi_app.state, "otel_provider"):
        fastapi_app.state.otel_provider.shutdown()
        logger.info("OpenTelemetry provider shut down")


app = FastAPI(title="Mana Forge Engine", version="1.0.0", lifespan=lifespan)
_setup_otel(app)

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
