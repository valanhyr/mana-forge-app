import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "/api";
// Crear instancia base de Axios
export const api = axios.create({
  baseURL: API_URL,
});

// Interceptor de Solicitud: Inyecta el idioma en cada petición
api.interceptors.request.use(
  (config) => {
    // Leemos directamente del localStorage para evitar problemas de sincronización de estado en el ciclo de vida de React
    const locale = localStorage.getItem("app_locale") || "es";

    config.headers["Accept-Language"] = locale;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);
