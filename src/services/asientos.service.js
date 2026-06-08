import { api } from '../config/axios';

/**
 * Servicio para interactuar con el backend de Viajes y Asientos
 */
export const AsientosService = {
  
  /**
   * Obtiene la lista de viajes según los filtros
   */
  getViajes: async (params = {}) => {
    // ExtJS usa /viajes/viajeSelect
    const response = await api.get('/viajes/viajeSelect', { params });
    return response.data;
  },

  /**
   * Obtiene los asientos y pasajeros de un viaje específico
   * @param {string} idViaje 
   */
  getAsientosViaje: async (idViaje) => {
    // ExtJS usa /viajes/asientosViajes con params via_codigo
    const response = await api.get('/viajes/asientosViajes', { params: { via_codigo: idViaje } });
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

  getRutasParaFiltro: async () => {
    const response = await api.get('/rutas/rutasSeleccionCombo');
    return response.data;
  }
};
