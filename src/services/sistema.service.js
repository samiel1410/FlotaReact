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

/**
 * Obtiene el plan de borrado del cambio a Producción (tablas, existencia y filas).
 * @returns {Promise<object|null>} null si no se pudo obtener
 */
export const getSistemaModoPlan = async () => {
  try {
    const res = await api.get('/sistema/modo/plan');
    return res.data?.success ? res.data.data : null;
  } catch {
    return null;
  }
};

/**
 * Valida un correo contra el backend (sintaxis + errores de escritura + DNS).
 * Devuelve null si no se pudo consultar; en ese caso el envío igualmente
 * valida el correo en el servidor.
 *
 * @param {string} correo
 * @param {{verificarMx?: boolean, permitirVacio?: boolean}} [opciones]
 * @returns {Promise<object|null>}
 */
export const validarCorreo = async (correo, opciones = {}) => {
  try {
    const res = await api.post('/sistema/validarCorreo', {
      correo,
      verificar_mx: opciones.verificarMx !== false,
      permitir_vacio: opciones.permitirVacio === true
    });
    return res.data?.success ? res.data.data : null;
  } catch {
    return null;
  }
};

/**
 * Estado del servicio de correo. `data.bloqueado === true` significa que el
 * proveedor está rechazando TODOS los envíos (por ejemplo, SES con el envío
 * pausado), aunque el correo del cliente sea válido.
 *
 * @returns {Promise<object|null>} null si no se pudo consultar
 */
export const getEstadoCorreo = async () => {
  try {
    const res = await api.get('/sistema/estadoCorreo');
    return res.data?.success ? res.data.data : null;
  } catch {
    return null;
  }
};
