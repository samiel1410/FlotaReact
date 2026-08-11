/**
 * Configuración dinámica del entorno.
 * El legacy (ExtJS) dependía de sessionStorage para las variables dinámicas
 * proporcionadas por el auth service.
 */

export const isLocal =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1' ||
  window.location.hostname.indexOf('192.168.') === 0;

export const CONFIG = {
  // Authentication Service URL (fijo, usado para login)
  get AUTH_API_URL() {
    return isLocal ? 'http://localhost:4000' : 'https://usuarioeasys.easysplus.com';
  },

  // Backend URL dinámica (asignada tras el login y guardada en sessionStorage)
  get API_URL() {
    const url = sessionStorage.getItem('backend_url') || '';
    if (isLocal) {
      // Si estamos en entorno local, forzar el uso del servidor backend local (http://localhost:3000)
      return 'http://localhost:3000';
    }
    return url;
  },

  get REDIRECT_URL() {
    return isLocal ? 'http://localhost/SistemaFlota/FrontReact/' : 'https://app.easysplus.com/';
  },

  get PHP_URL() {
    if (isLocal) return 'http://localhost/SistemaFlota/FrontReact/php';
    const stored = sessionStorage.getItem('php_url');
    if (stored) return stored;
    return `${window.location.origin}/php`;
  },

  get CLIENTE_URL() {
    return 'https://clientesfp.easysplus.com';
  },

  get API_FIRMA() {
    return isLocal ? 'http://localhost:3000' : 'https://firmar.easysplus.com';
  }
};
