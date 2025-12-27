# Usamos python 3.11 slim que tiene soporte multi-arquitectura (incluyendo linux/arm64)
FROM python:3.11-slim

# Evita que Python genere archivos .pyc y habilita logs en tiempo real
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalamos dependencias
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiamos el código fuente
COPY . .

# Exponemos el puerto
EXPOSE 8000

# Creamos un usuario no root por seguridad
RUN useradd -m appuser && chown -R appuser /app
USER appuser

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
