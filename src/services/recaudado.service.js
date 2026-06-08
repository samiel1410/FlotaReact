import { api } from '../config/axios';

/**
 * Servicio para interactuar con el backend de Recaudado (Buseros)
 */
export const RecaudadoService = {
  
  /**
   * Obtiene la lista de recaudación por buses
   * @param {Object} params - Parámetros de búsqueda (limit, start, filtros...)
   */
  getRecaudacion: async (params = {}) => {
    // URL original de ExtJS: /boleteria/facturaRetenidoEmitido
    const response = await api.post('/boleteria/facturaRetenidoEmitido', params);
    return response.data;
  },

  /**
   * Obtiene los combos para los filtros
   */
  getPersonalParaFiltro: async () => {
    const response = await api.get('/personal/read_combo');
    return response.data;
  },

  getBusesParaFiltro: async () => {
    const response = await api.get('/buses/read_combo');
    return response.data;
  },

  getRutasParaFiltro: async () => {
    const response = await api.get('/rutas/read_combo');
    return response.data;
  }
};
