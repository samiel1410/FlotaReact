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
    return sessionStorage.getItem('backend_url') || '';
  },

  get REDIRECT_URL() {
    return isLocal ? 'http://localhost/SistemaFlota/FrontReact/' : 'https://app.easysplus.com/';
  },

  get PHP_URL() {
    return isLocal ? 'http://localhost/SistemaFlota/FrontReact/php' : 'https://app.easysplus.com/php';
  },

  get CLIENTE_URL() {
    return isLocal ? 'http://localhost/SistemaFlota/FrontReact/' : 'https://clientesfp.easysplus.com';
  },

  get API_FIRMA() {
    return isLocal ? 'http://localhost:3000' : 'https://firmar.easysplus.com';
  }
};
