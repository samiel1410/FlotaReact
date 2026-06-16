import { api } from '../config/axios';

export const despachoNotaVentaService = {
  // Listar despachos paginados con filtros
  async listar(params = {}) {
    const response = await api.get('/despacho_nota_venta/despachoSeleccionPaginado', { params });
    return response.data;
  },

  // Listar detalles (guías) de un despacho
  async listarDetalle(params = {}) {
    const response = await api.get('/despacho_nota_venta/despachoDetalleSeleccionPaginado', { params });
    return response.data;
  },

  // Crear nuevo despacho maestro
  async crear(params = {}) {
    const response = await api.post('/despacho_nota_venta/insertarActualizarDespacho', params);
    return response.data;
  },

  // Editar despacho (cambiar bus)
  async editar(params = {}) {
    const response = await api.post('/despacho_nota_venta/editarDespacho', params);
    return response.data;
  },

  // Eliminar guía de despacho
  async eliminar(params = {}) {
    const response = await api.post('/despacho_nota_venta/despachoEliminar', params);
    return response.data;
  },

  // Verificar si un despacho ya tiene guías finalizadas
  async verificarGuia(params = {}) {
    const response = await api.post('/despacho_nota_venta/verificarGuiaDespacho', params);
    return response.data;
  },

  // Agregar guía a despacho
  async agregarGuia(params = {}) {
    const response = await api.post('/despacho_nota_venta/agregarDespacho', params);
    return response.data;
  },

  // Listar guías disponibles para agregar a despacho
  async listarGuiasDisponibles(params = {}) {
    const response = await api.get('/despacho_nota_venta/guialistadoDespacho', { params });
    return response.data;
  },

  // Crear PDF y devolver nombre de archivo
  async crearPdf(params = {}) {
    const response = await api.get('/despacho_nota_venta/crearPDF', { params });
    return response.data;
  }
};
