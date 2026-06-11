import { api } from '../config/axios';

const STORAGE_KEY = 'sistema_modo_cache';
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

/**
 * Obtiene el modo del sistema (prueba|produccion).
 * Cachea en sessionStorage para evitar peticiones duplicadas.
 * @param {boolean} forceRefresh - Si true, ignora la cache y forza una nueva petición
 * @returns {Promise<string>} 'prueba' | 'produccion'
 */
let pendingPromise = null;

export const getSistemaModo = async (forceRefresh = false) => {
  // Intentar leer de cache primero
  if (!forceRefresh) {
    try {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) {
        const { modo, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return modo;
        }
      }
    } catch { /* ignorar */ }
  }

  // Evitar peticiones paralelas duplicadas
  if (pendingPromise) return pendingPromise;

  pendingPromise = api.get('/sistema/modo').then(res => {
    const modo = res.data?.data?.modo || 'prueba';
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ modo, timestamp: Date.now() }));
    return modo;
  }).catch(() => {
    return 'prueba'; // fallback seguro
  }).finally(() => {
    pendingPromise = null;
  });

  return pendingPromise;
};

/**
 * Actualiza el modo en cache (útil después de cambiar el modo)
 */
export const setSistemaModoCache = (modo) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ modo, timestamp: Date.now() }));
};
