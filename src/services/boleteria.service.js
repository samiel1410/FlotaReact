import { api } from '../config/axios';

/**
 * Servicio para interactuar con el backend de Boletería
 * Endpoints reales del backend Node legacy
 */
export const BoleteriaService = {

  // ============ LISTADO DE BOLETOS ============

  /**
   * Obtiene lista paginada de boletos (endpoint real: /boleto/listadoBoletos)
   * @param {Object} params
   * @param {number} params.id_usuario - Filtro por usuario
   * @param {number} params.id_bus - Filtro por bus
   * @param {number} params.id_ruta - Filtro por ruta
   * @param {string|number} params.estado - Estado del boleto (0,1,2,3,4=todos)
   * @param {string} params.numero_boleto - Número de boleto
   * @param {string} params.identificacion - Identificación del cliente
   * @param {string} params.fecha_desde - Fecha inicio (YYYY-MM-DD)
   * @param {string} params.fecha_hasta - Fecha fin (YYYY-MM-DD)
   * @param {number} params.limit - Registros por página
   * @param {number} params.page - Número de página
   */
  getBoletos: async (params = {}) => {
    const response = await api.get('/boleto/listadoBoletos', { params });
    return response.data;
  },

  // ============ COMBOS PARA FILTROS ============

  getUsuariosParaFiltro: async () => {
    const response = await api.get('/usuario/usuarioSeleccionarCombo');
    return response.data;
  },

  getBusesParaFiltro: async () => {
    const response = await api.get('/buses/seleccionarBusesCombo');
    return response.data;
  },

  getRutasParaFiltro: async () => {
    const response = await api.get('/rutas/rutasSeleccionCombo');
    return response.data;
  },

  // ============ VIAJES DISPONIBLES (PARA VENTA) ============

  /**
   * Obtiene viajes disponibles para la fecha actual
   */
  getViajesDisponibles: async (params = {}) => {
    const response = await api.get('/viajes/viajesSelectBoleto', { params });
    return response.data;
  },

  /**
   * Obtiene horas disponibles para origen/destino
   * @param {Object} params - { fecha, origenId, destinoId }
   */
  getHorasDisponibles: async (params = {}) => {
    const response = await api.get('/viajes/horasDisponibles', { params });
    return response.data;
  },

  /**
   * Obtiene destinos (sub-rutas) disponibles para un viaje
   * @param {number} idViaje
   */
  getDestinosViaje: async (idViaje) => {
    const response = await api.get('/viajes/destinoViajeSelect', { params: { id_viaje: idViaje } });
    return response.data;
  },

  /**
   * Obtiene asientos del bus para un viaje (con ocupación)
   * @param {number} idViaje
   * @param {number} [idOrigen] - Para filtrar ocupación por tramo
   */
  getAsientosBusViaje: async (idViaje, idOrigen) => {
    const params = { id_viaje: idViaje };
    if (idOrigen) params.id_origen = idOrigen;
    const response = await api.post('/viajes/asientosBusViaje', params);
    return response.data;
  },

  /**
   * Obtiene asientos disponibles/resumen de ocupación
   * @param {number} idViaje
   */
  getAsientosDisponibles: async (idViaje) => {
    const response = await api.get('/viajes/asientosdisponibles', { params: { id_viaje: idViaje } });
    return response.data;
  },

  // ============ DESTINOS (ORIGEN/DESTINO) ============

  getDestinos: async () => {
    const response = await api.get('/destino/destinoSeleccionCombo');
    return response.data;
  },

  // ============ VENTA DE BOLETO ============

  /**
   * Inserta un nuevo boleto (endpoint real: /boleto/insertarBoleto)
   * @param {Object} boletoData - Datos del boleto a insertar
   */
  venderBoleto: async (boletoData) => {
    const response = await api.post('/boleto/insertarBoleto', boletoData);
    return response.data;
  },

  // ============ ANULACIONES ============

  anularBoleto: async (idBoleto) => {
    const response = await api.post('/boleteria/insertarBoletosAnulacion', { id_boleto: idBoleto });
    return response.data;
  },

  // ============ CAMBIO DE FECHA DE VIAJE ============

  /**
   * Cambia la fecha de viaje de un boleto (solo el mismo usuario que lo vendió)
   * @param {number} id_boleto - ID del boleto
   * @param {number} id_viaje_nuevo - ID del nuevo viaje
   */
  cambiarFechaViaje: async (id_boleto, id_viaje_nuevo) => {
    const response = await api.post('/boleto/cambiarFechaViaje', { id_boleto, id_viaje_nuevo });
    return response.data;
  },

  // ============ SRI ============

  autorizarLoteSRI: async (fechas) => {
    const response = await api.post('/sri/autorizar_lote', fechas);
    return response.data;
  },

  prepararBoletoSRI: async (idBoleto) => {
    const response = await api.post('/boleto/prepararBoleto', { id_boleto: idBoleto });
    return response.data;
  },

  autorizarBoleto: async (idBoleto, estado = 'AUTORIZADO', mensaje = '') => {
    const response = await api.post('/boleto/registrarAutorizacion', { id_boleto: idBoleto, estado, mensaje });
    return response.data;
  }
};
