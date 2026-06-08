import { api } from '../config/axios';

export const despachoConvenioService = {
  // Listar despachos paginados con filtros
  async listar(params = {}) {
    const response = await api.get('/despacho_convenio/despachoSeleccionPaginado', { params });
    return response.data;
  },

  // Listar detalles (guías) de un despacho
  async listarDetalle(params = {}) {
    const response = await api.get('/despacho_convenio/despachoDetalleSeleccionPaginado', { params });
    return response.data;
  },

  // Crear nuevo despacho maestro
  async crear(params = {}) {
    const response = await api.post('/despacho_convenio/insertarActualizarDespacho', params);
    return response.data;
  },

  // Editar despacho (cambiar bus)
  async editar(params = {}) {
    const response = await api.post('/despacho_convenio/editarDespacho', params);
    return response.data;
  },

  // Eliminar guía de despacho
  async eliminar(params = {}) {
    const response = await api.post('/despacho_convenio/despachoEliminar', params);
    return response.data;
  },

  // Verificar si un despacho ya tiene guías finalizadas
  async verificarGuia(params = {}) {
    const response = await api.post('/despacho_convenio/verificarGuiaDespacho', params);
    return response.data;
  },

  // Agregar guía a despacho
  async agregarGuia(params = {}) {
    const response = await api.post('/despacho_convenio/agregarDespacho', params);
    return response.data;
  },

  // Listar guías disponibles para agregar a despacho
  async listarGuiasDisponibles(params = {}) {
    const response = await api.get('/despacho_convenio/guialistadoDespacho', { params });
    return response.data;
  },

  // Crear PDF y devolver nombre de archivo
  async crearPdf(params = {}) {
    const response = await api.get('/despacho_convenio/crearPDF', { params });
    return response.data;
  }
};
