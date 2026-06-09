import axios from 'axios';
import { CONFIG } from './env';

// Crear una instancia principal para las llamadas al backend (rutas protegidas)
export const api = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de Request: Agrega dinámicamente la baseURL y el Token
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('auth_token');
    const backendUrl = CONFIG.API_URL; // Dinámico
    
    // Si la llamada no es absoluta (no empieza con http), añadir el baseURL
    if (backendUrl && !config.url.startsWith('http')) {
        config.baseURL = backendUrl;
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // ExtJS classic style: POST requests send data as form-urlencoded
    if (config.method === 'post' && config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      config.headers['Content-Type'] = 'application/x-www-form-urlencoded';
      const params = new URLSearchParams();
      for (const key in config.data) {
        if (config.data[key] !== undefined && config.data[key] !== null) {
          params.append(key, config.data[key]);
        }
      }
      config.data = params;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ===========================
// Gestión Global de Errores
// ===========================

// Evento personalizado para mostrar notificaciones toast desde cualquier parte
export const errorEventBus = new EventTarget();

// Función auxiliar para despachar errores como eventos globales
function dispatchError(error) {
  const errorInfo = extractErrorInfo(error);
  errorEventBus.dispatchEvent(new CustomEvent('api-error', { detail: errorInfo }));
  return errorInfo;
}

// Extraer información útil del error de Axios
function extractErrorInfo(error) {
  const response = error.response;
  const request = error.request;
  const config = error.config;

  // Error de timeout
  if (error.code === 'ECONNABORTED') {
    return {
      type: 'timeout',
      status: 0,
      message: 'La solicitud ha excedido el tiempo de espera. Verifique su conexión.',
      url: config?.url,
      method: config?.method?.toUpperCase(),
    };
  }

  // Error de red (no hubo respuesta del servidor)
  if (!response) {
    if (error.message === 'Network Error') {
      return {
        type: 'network',
        status: 0,
        message: 'Error de conexión. Verifique que el servidor esté disponible.',
        url: config?.url,
        method: config?.method?.toUpperCase(),
      };
    }
    return {
      type: 'unknown',
      status: 0,
      message: error.message || 'Error desconocido de red',
      url: config?.url,
      method: config?.method?.toUpperCase(),
    };
  }

  // Errores HTTP con respuesta del servidor
  const status = response.status;
  const serverMessage = response.data?.message || response.data?.error || response.data?.detalle;

  const errorMap = {
    400: { type: 'bad_request', message: serverMessage || 'Solicitud incorrecta. Verifique los datos ingresados.' },
    401: { type: 'unauthorized', message: 'Sesión expirada. Ingrese nuevamente al sistema.' },
    403: { type: 'forbidden', message: 'No tiene permisos para realizar esta acción.' },
    404: { type: 'not_found', message: serverMessage || 'Recurso no encontrado.' },
    409: { type: 'conflict', message: serverMessage || 'Conflicto con el estado actual del recurso.' },
    422: { type: 'validation', message: serverMessage || 'Error de validación en los datos enviados.' },
    429: { type: 'rate_limit', message: 'Demasiadas solicitudes. Espere un momento e intente nuevamente.' },
    500: { type: 'server', message: serverMessage || 'Error interno del servidor. Contacte al administrador.' },
    502: { type: 'bad_gateway', message: 'El servidor no está disponible temporalmente.' },
    503: { type: 'service_unavailable', message: 'Servicio no disponible. Intente más tarde.' },
  };

  const errorDef = errorMap[status] || {
    type: 'http_error',
    message: serverMessage || `Error HTTP ${status}`,
  };

  return {
    ...errorDef,
    status,
    url: config?.url,
    method: config?.method?.toUpperCase(),
    serverData: response.data,
  };
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const errorInfo = dispatchError(error);

    // Manejo especial para 401: cerrar sesión y redirigir
    if (errorInfo.status === 401) {
      console.error('[Auth] Sesión expirada o token inválido. Redirigiendo al login...');
      sessionStorage.clear();
      window.location.href = '/#/login';
    }

    // Log en consola para desarrollo (solo errores no manejados)
    if (errorInfo.status >= 500) {
      console.error(`[API Error] ${errorInfo.method} ${errorInfo.url} → ${errorInfo.status}:`, errorInfo.message);
    }

    return Promise.reject(error);
  }
);

// Instancia separada para auth, ya que va a otro servidor
export const authApi = axios.create({
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth URL
authApi.interceptors.request.use(config => {
  config.baseURL = CONFIG.AUTH_API_URL;
  return config;
});

// Instancia separada para búsqueda de clientes (clientesfp.easysplus.com)
export const clienteApi = axios.create({
  baseURL: CONFIG.CLIENTE_URL, // Se establece aquí para que axios lo tome correctamente
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

clienteApi.interceptors.request.use(config => {
  if (!config.url.startsWith('http')) {
    config.baseURL = CONFIG.CLIENTE_URL;
  }
  return config;
});
