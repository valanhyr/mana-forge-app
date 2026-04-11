// Asumiendo que la API de Java corre en el puerto 8080
export const API_BASE_URL = import.meta.env.DEV
  ? 'http://localhost:8080'
  : 'https://api.manaforge.com'; // Reemplazar en producción
