import { authApi } from '../config/axios';
import axios from 'axios';

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
      await axios.post('../php/login.php', {
        id_usuario: loginData.user.id_usuario,
        db_name: loginData.db_name,
        db_host: loginData.db_host,
        db_user: loginData.db_user,
        db_pass: loginData.db_pass
      }, {
        timeout: 5000
      });
      console.log('✅ PHP Session Bridge established');
    } catch (phpErr) {
      console.warn('⚠️ PHP Session Bridge failed, but continuing...', phpErr);
    }
  }
};
