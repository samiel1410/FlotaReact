import { api } from '../config/axios';

export const despachoService = {
  // Listar despachos paginados
  async listar(params = {}) {
    const response = await api.get('/despacho/despachoSeleccionPaginado', { params });
    return response.data;
  },

  // Listar detalles de despacho paginados
  async listarDetalle(params = {}) {
    const response = await api.get('/despacho/despachoDetalleSeleccionPaginado', { params });
    return response.data;
  },

  // Crear despacho (agregar)
  async crear(params = {}) {
    const response = await api.post('/despacho/agregarDespacho', params);
    return response.data;
  },

  // Editar despacho
  async editar(params = {}) {
    const response = await api.post('/despacho/editarDespacho', params);
    return response.data;
  },

  // Eliminar guía de despacho
  async eliminar(params = {}) {
    const response = await api.post('/despacho/despachoEliminar', params);
    return response.data;
  },

  // Verificar si un despacho ya tiene guía
  async verificarGuia(params = {}) {
    const response = await api.post('/despacho/verificarGuiaDespacho', params);
    return response.data;
  },

  // Insertar o actualizar despacho (wizard)
  async insertarActualizar(params = {}) {
    const response = await api.post('/despacho/insertarActualizarDespacho', params);
    return response.data;
  },

  // Generar PDF de despacho
  async generarPdf(params = {}) {
    const response = await api.get('/despacho/despachoPdf', { params, responseType: 'blob' });
    return response.data;
  }
};