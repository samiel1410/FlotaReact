import { authApi } from '../config/axios';
import axios from 'axios';

/**
 * Deriva la URL base de PHP a partir de la ruta real donde se sirve la app.
 * Funciona tanto en dev (Vite en la raíz) como cuando la app se sirve desde
 * una subcarpeta (ej. http://localhost/SistemaFlota/FrontReact/).
 * NO usa ".." relativo porque rompe el puente en rutas con subcarpeta.
 *
 * Nota: la derivación por pathname es válida porque la app usa HashRouter
 * (el pathname es siempre la base, sin importar la ruta interna).
 */
function getPhpBaseUrl() {
  // Si hay un php_url explícito en sessionStorage y es del mismo origen, respetarlo
  const stored = sessionStorage.getItem('php_url');
  if (stored) {
    try {
      const url = new URL(stored);
      if (url.origin === window.location.origin) {
        return url.origin + url.pathname.replace(/\/$/, '');
      }
    } catch (e) {
      // URL inválida: ignorar y derivar de la ruta real de la app
    }
  }

  const basePath = window.location.pathname.replace(/\/$/, '');
  return `${window.location.origin}${basePath}/php`;
}

export const AuthService = {
  /**
   * Realiza el login contra el Auth Service principal.
   * @param {string} username 
   * @param {string} password 
   * @returns {Promise<any>}
   */
  async login(username, password) {
    const response = await authApi.post('/auth/login', { username, password });
    return response.data;
  },

  /**
   * Refresca el token
   * @param {string} refresh_token 
   * @returns {Promise<any>}
   */
  async refreshToken(refresh_token) {
    const response = await authApi.post('/auth/refresh', { refresh_token });
    return response.data;
  },

  /**
   * Puente legacy para mantener la sesión de PHP activa (como lo hacía ExtJS)
   * @param {object} loginData - Los datos devueltos por la API de login
   */
  async phpSessionBridge(loginData) {
    try {
      const url = `${getPhpBaseUrl()}/login.php`;
      const response = await axios.post(url, {
        id_usuario: loginData.user?.id_usuario,
        db_name: loginData.db_name,
        db_host: loginData.db_host,
        db_user: loginData.db_user,
        db_pass: loginData.db_pass
      }, {
        timeout: 5000,
        withCredentials: true
      });

      if (response.data?.success) {
        console.log(`✅ PHP Session Bridge established (${url})`);
        return true;
      }

      console.warn('⚠️ PHP Session Bridge: el servidor respondió sin success →', response.data);
      return false;
    } catch (phpErr) {
      console.warn('⚠️ PHP Session Bridge failed, but continuing...', phpErr);
      return false;
    }
  }
};
