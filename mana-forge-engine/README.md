# Mana Forge Engine

Microservicio de IA para Mana Forge, encargado de generar sugerencias de mazos y análisis estratégicos utilizando LLMs (Groq/Llama 3).

## Requisitos

- Python 3.11+
- Una API Key de [Groq](https://console.groq.com/)

## Instalación y Ejecución Local

1.  **Crear entorno virtual:**

    ```bash
    python -m venv venv
    # Windows
    .\venv\Scripts\activate
    # Linux/Mac
    source venv/bin/activate
    ```

2.  **Instalar dependencias:**

    ```bash
    pip install -r requirements.txt
    ```

3.  **Configuración:**
    Crea un archivo `.env` basado en `.env.example` y añade tu API Key:

    ```
    GROQ_API_KEY=gsk_...
    ```

4.  **Ejecutar:**
    ```bash
    python main.py
    ```
    El servidor arrancará en `http://localhost:8000`.
