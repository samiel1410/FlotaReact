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
    const response = await api.get('/boleteria/facturaRetenidoEmitido', { params });
    return response.data;
  },

  /**
   * Obtiene los combos para los filtros
   */
  getPersonalParaFiltro: async () => {
    const response = await api.get('/personal/personalSelectCombo');
    return response.data;
  },

  getBusesParaFiltro: async () => {
    const response = await api.get('/buses/seleccionarBusesCombo');
    return response.data;
  },

  /**
   * Desglose de retenciones de un viaje (Unión, Seguros, cuota administrativa, etc.)
   * @param {number} idViaje
   */
  getDetalleRetenciones: async (idViaje) => {
    const response = await api.get('/boleteria/retencionesDetalle', { params: { id_viaje: idViaje } });
    return response.data;
  },

  getRutasParaFiltro: async () => {
    const response = await api.get('/rutas/rutasSeleccionCombo');
    return response.data;
  }
};
