import { api } from '../config/axios';

const ViajesService = {
  // ─── COMBOS ──────────────────────────────────────────────────────────────
  getRoutes: async () => {
    try {
      const response = await api.get('/rutas/rutasSeleccionCombo');
      return { success: true, data: response.data?.data || response.data || [] };
    } catch (error) {
      console.error('Error fetching routes:', error);
      return { success: false, data: [], message: error.response?.data?.message || 'Error al cargar rutas' };
    }
  },

  getBuses: async () => {
    try {
      const response = await api.get('/buses/seleccionarBusesCombo');
      return { success: true, data: response.data?.data || response.data || [] };
    } catch (error) {
      console.error('Error fetching buses:', error);
      return { success: false, data: [], message: error.response?.data?.message || 'Error al cargar buses' };
    }
  },

  getPersonal: async (params = {}) => {
    try {
      const response = await api.get('/personal/personalSelectCombo', { params });
      return { success: true, data: response.data?.data || response.data || [] };
    } catch (error) {
      console.error('Error fetching personal:', error);
      return { success: false, data: [], message: error.response?.data?.message || 'Error al cargar personal' };
    }
  },

  getUsuarios: async () => {
    try {
      const response = await api.get('/usuario/usuarioSeleccionarCombo');
      return { success: true, data: response.data?.data || response.data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  },

  // ─── VIAJES (CRUD) ──────────────────────────────────────────────────────
  getTrips: async (params = {}) => {
    try {
      const response = await api.get('/viajes/listado', { params });
      return { success: true, data: response.data?.data || [], total: response.data?.total || 0 };
    } catch (error) {
      console.error('Error fetching trips:', error);
      return { success: false, data: [], total: 0, message: error.response?.data?.message || 'Error al cargar viajes' };
    }
  },

  createTrip: async (tripData) => {
    try {
      const response = await api.post('/viajes/crearViaje', tripData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Error creating trip:', error);
      return { success: false, message: error.response?.data?.message || 'Error al crear viaje' };
    }
  },

  changeBusTrip: async ({ id_viaje, id_bus, id_chofer, id_auxiliar }) => {
    try {
      const response = await api.post('/viajes/cambiarBusViaje', { id_viaje, id_bus, id_chofer, id_auxiliar });
      return { success: true, data: response.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al actualizar bus' };
    }
  },

  // ─── DESPACHO ────────────────────────────────────────────────────────────
  getTripsToDispatch: async (params = {}) => {
    try {
      const response = await api.get('/viajes/viajesDespachar', { params });
      return { success: true, data: response.data?.data || [], total: response.data?.total || 0 };
    } catch (error) {
      return { success: false, data: [], message: error.response?.data?.message || 'Error al cargar viajes para despachar' };
    }
  },

  getTripDetail: async (id_viaje, id_sucursal = null) => {
    try {
      const params = { id_viaje };
      if (id_sucursal) params.id_sucursal = id_sucursal;
      const response = await api.get('/viajes/detalleDespacho', { params });
      return response.data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al cargar detalle' };
    }
  },

  dispatchTrip: async (payload) => {
    try {
      const response = await api.post('/viajes/despacharViaje', payload);
      return response.data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al despachar viaje' };
    }
  },

  marcarNoCumple: async ({ id_viaje, motivo }) => {
    try {
      const response = await api.post('/viajes/noCumpleViaje', { id_viaje, motivo });
      return response.data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al marcar viaje como No Cumple' };
    }
  },

  reversarDespacho: async (params) => {
    try {
      const payload = typeof params === 'object' ? params : { id_viaje: params };
      const response = await api.post('/viajes/reversarDespacho', payload);
      return response.data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al reversar despacho' };
    }
  },

  getHistorialReversa: async (id_viaje) => {
    try {
      const response = await api.get('/viajes/historialReversa', { params: { id_viaje } });
      return response.data;
    } catch (error) {
      return { success: false, data: [], message: error.response?.data?.message || 'Error al obtener historial de reversas' };
    }
  },

  habilitarTiempoExtra: async (id_viaje, minutos) => {
    try {
      const response = await api.post('/viajes/habilitarTiempoExtra', { id_viaje, minutos });
      return response.data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al habilitar tiempo extra' };
    }
  },

  // ─── ITINERARIO ─────────────────────────────────────────────────────────
  getItinerario: async (id_viaje) => {
    try {
      const response = await api.get('/viajes/itinerarioViaje', { params: { id_viaje } });
      return response.data;
    } catch (error) {
      return { success: false, data: [], message: error.response?.data?.message || 'Error al cargar itinerario' };
    }
  },

  saveItinerario: async (id_viaje, paradas) => {
    try {
      const response = await api.post('/viajes/itinerarioViaje', { id_viaje, paradas });
      return response.data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al guardar itinerario' };
    }
  },

  // ─── CXC UNIDAD ─────────────────────────────────────────────────────────
  getCxCUnidad: async (id_bus) => {
    try {
      const response = await api.get('/viajes/cxcUnidad', { params: { id_bus } });
      return response.data;
    } catch (error) {
      return { success: false, cxc: 0 };
    }
  },

  // ─── PLANIFICACIÓN (CREACIÓN MASIVA) ────────────────────────────────────
  getPlanificacion: async (fecha_inicio) => {
    try {
      const response = await api.get('/viajes/planificacionViajes', { params: { fecha_inicio } });
      return { success: true, data: response.data?.data || response.data || [] };
    } catch (error) {
      return { success: false, data: [], message: error.response?.data?.message || 'Error al cargar planificación' };
    }
  },

  bulkCreateTrips: async (detalles) => {
    try {
      const response = await api.post('/viajes/insertarViajesMasivos', { detalles });
      return response.data;
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al crear viajes masivos' };
    }
  },
};

export { ViajesService };
export default ViajesService;
