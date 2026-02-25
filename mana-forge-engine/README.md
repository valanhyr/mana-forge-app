# Mana Forge Engine

Microservicio de IA para Mana Forge. Genera sugerencias de sideboard, análisis estratégicos y mazos aleatorios usando Groq (Llama 3.3 70B).

## Requisitos

- Python 3.11+
- API Key de [Groq](https://console.groq.com/)

## Instalación

```bash
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

## Configuración

Copia `.env.example` a `.env` y añade tu API Key:

```
GROQ_API_KEY=gsk_...
CORS_ORIGINS=http://localhost:5173,http://localhost:8080
```

## Ejecución

```bash
python main.py
# Servidor en http://localhost:8000
# Docs interactivos: http://localhost:8000/docs
```

## Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servicio |
| POST | `/v1/ai/suggest-sideboard` | Sugiere 15 cartas de sideboard para un mazo |
| POST | `/v1/ai/analyze-deck` | Análisis completo con matchups y cambios sugeridos |
| POST | `/v1/ai/generate-random-deck` | Genera un mazo competitivo aleatorio |

## Formatos soportados

`Premodern`, `Modern`, `Legacy`, `Pauper`, `Commander` / `EDH`, `cEDH`, `Duel Commander`, `Pauper Commander`

## Tests manuales

Con el servidor corriendo:

```bash
python test_request.py       # Sideboard — Mono Red Burn (Premodern)
python test_custom_meta.py   # Análisis — Goblins con meta personalizado (Premodern)
```

