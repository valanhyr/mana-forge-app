import axios from "axios";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8080",
  headers: {
    "Content-Type": "application/json",
  },
});

// Aquí podrías añadir interceptores para el token JWT en el futuro
export default apiClient;
