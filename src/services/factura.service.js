import { api } from '../config/axios';

/**
 * Servicio de Facturación
 * Conecta el frontend React con los endpoints del backend
 * Endpoints: /factura/*
 */

export const facturaService = {
  // ─── LISTADO DE FACTURAS ──────────────────────────────────────────────────
  /**
   * Obtener listado de facturas con filtros y paginación
   * @param {Object} params - Filtros de búsqueda
   * @returns {Promise}
   */
  async facturalistado(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.nombrecliente) queryParams.append('nombrecliente', params.nombrecliente);
      if (params.rucliente) queryParams.append('rucliente', params.rucliente);
      if (params.fechaini) queryParams.append('fechaini', params.fechaini);
      if (params.fechalast) queryParams.append('fechalast', params.fechalast);
      if (params.mes) queryParams.append('mes', params.mes);
      if (params.anio) queryParams.append('anio', params.anio);
      if (params.factura) queryParams.append('factura', params.factura);
      if (params.numeroguia) queryParams.append('numeroguia', params.numeroguia);
      if (params.estado) queryParams.append('estado', params.estado);
      if (params.estadosincro) queryParams.append('estadosincro', params.estadosincro);
      if (params.idusuario) queryParams.append('idusuario', params.idusuario);
      queryParams.append('page', params.page || 1);
      queryParams.append('limit', params.limit || 25);

      const response = await api.get(`/factura/facturalistado?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener listado de facturas:', error);
      throw error;
    }
  },

  /**
   * Obtener listado de facturas pendientes
   * @param {Object} params
   * @returns {Promise}
   */
  async facturalistadoPendientes(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.nombrecliente) queryParams.append('nombrecliente', params.nombrecliente);
      if (params.rucliente) queryParams.append('rucliente', params.rucliente);
      if (params.fechaini) queryParams.append('fechaini', params.fechaini);
      if (params.fechalast) queryParams.append('fechalast', params.fechalast);
      if (params.mes) queryParams.append('mes', params.mes);
      if (params.anio) queryParams.append('anio', params.anio);
      if (params.factura) queryParams.append('factura', params.factura);
      if (params.numeroguia) queryParams.append('numeroguia', params.numeroguia);
      if (params.estado) queryParams.append('estado', params.estado);
      if (params.estadosincro) queryParams.append('estadosincro', params.estadosincro);
      if (params.idusuario) queryParams.append('idusuario', params.idusuario);
      queryParams.append('page', params.page || 1);
      queryParams.append('limit', params.limit || 25);

      const response = await api.get(`/factura/facturalistadoPendientes?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener facturas pendientes:', error);
      throw error;
    }
  },

  /**
   * Obtener información general de facturación
   * @returns {Promise}
   */
  async facturaListadoInfo() {
    try {
      const response = await api.get('/factura/facturaListadoInfo');
      return response.data;
    } catch (error) {
      console.error('Error al obtener info de facturación:', error);
      throw error;
    }
  },

  // ─── AUTORIZACIÓN ─────────────────────────────────────────────────────────
  /**
   * Listado de facturas para autorizar
   * @param {Object} params - { page, limit }
   * @returns {Promise}
   */
  async facturalistadoautorizar(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('page', params.page || 1);
      queryParams.append('limit', params.limit || 10);

      const response = await api.get(`/factura/facturalistadoautorizar?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener facturas para autorizar:', error);
      throw error;
    }
  },

  /**
   * Verificar si una factura está autorizada por guía
   * @param {number} id_guia
   * @returns {Promise}
   */
  async autorizadofacturaxguia(id_guia) {
    try {
      const response = await api.get(`/factura/autorizadofacturaxguia?id_guia=${id_guia}`);
      return response.data;
    } catch (error) {
      console.error('Error al verificar autorización:', error);
      throw error;
    }
  },

  /**
   * Verificar si la guía tiene factura autorizada
   * @param {number} id_guia
   * @returns {Promise}
   */
  async verificarGuiaFacturaAutorizada(id_guia) {
    try {
      const response = await api.get(`/factura/verificarGuiaFacturaAutorizada?id_guia=${id_guia}`);
      return response.data;
    } catch (error) {
      console.error('Error al verificar guía factura autorizada:', error);
      throw error;
    }
  },

  /**
   * Actualizar estado a autorizado
   * @param {number} id_factura
   * @param {string} fecha
   * @returns {Promise}
   */
  async actualizarEstadoAutorizado(id_factura, fecha) {
    try {
      const response = await api.post('/factura/actualizarEstadoAutorizado', {
        id_factura,
        fecha,
      });
      return response.data;
    } catch (error) {
      console.error('Error al actualizar estado autorizado:', error);
      throw error;
    }
  },

  /**
   * Actualizar clave identificador
   * @param {number} id_factura
   * @returns {Promise}
   */
  async actualizarClaveIdentificador(id_factura) {
    try {
      const response = await api.post('/factura/actualizarClaveIdentificador', { id_factura });
      return response.data;
    } catch (error) {
      console.error('Error al actualizar clave identificador:', error);
      throw error;
    }
  },

  // ─── SINCRONIZACIÓN ───────────────────────────────────────────────────────
  /**
   * Sincronizar facturas
   * @param {number} id_factura
   * @returns {Promise}
   */
  async sincronizarFacturas(id_factura) {
    try {
      const response = await api.post('/factura/sincronizarFacturas', { id_factura });
      return response.data;
    } catch (error) {
      console.error('Error al sincronizar facturas:', error);
      throw error;
    }
  },

  /**
   * Sincronizar facturas del usuario
   * @returns {Promise}
   */
  async sincronizarFacturasUsuario() {
    try {
      const response = await api.get('/factura/sincronizarFacturasUsuario');
      return response.data;
    } catch (error) {
      console.error('Error al sincronizar facturas del usuario:', error);
      throw error;
    }
  },

  /**
   * Verificar facturas autorizadas
   * @returns {Promise}
   */
  async verificarFacturasAutorizadas() {
    try {
      const response = await api.get('/factura/verificarFacturasAutorizadas');
      return response.data;
    } catch (error) {
      console.error('Error al verificar facturas autorizadas:', error);
      throw error;
    }
  },

  /**
   * Verificar factura sincronizada
   * @param {number} id_guia
   * @returns {Promise}
   */
  async verificarFacturaSincronizada(id_guia) {
    try {
      const response = await api.post('/factura/verificarFacturaSincronizada', { id_guia });
      return response.data;
    } catch (error) {
      console.error('Error al verificar factura sincronizada:', error);
      throw error;
    }
  },

  // ─── ANULACIONES ──────────────────────────────────────────────────────────
  /**
   * Anular factura (oficinista)
   * @param {number} id_usuario
   * @param {number} id_factura
   * @param {string} motivoAnulacion
   * @returns {Promise}
   */
  async anularOficinista(id_usuario, id_factura, motivoAnulacion) {
    try {
      const response = await api.post('/factura/anularoficinista', {
        id_usuario,
        id_factura,
        motivoAnulacion: motivoAnulacion.toUpperCase(),
      });
      return response.data;
    } catch (error) {
      console.error('Error al anular factura (oficinista):', error);
      throw error;
    }
  },

  /**
   * Anular factura (administrador)
   * @param {number} id_usuario
   * @param {number} id_factura
   * @param {string} motivoAnulacion
   * @returns {Promise}
   */
  async anularAdministrador(id_usuario, id_factura, motivoAnulacion) {
    try {
      const response = await api.post('/factura/anularadministrador', {
        id_usuario,
        id_factura,
        motivoAnulacion: motivoAnulacion.toUpperCase(),
      });
      return response.data;
    } catch (error) {
      console.error('Error al anular factura (admin):', error);
      throw error;
    }
  },

  /**
   * Anular todas las facturas
   * @param {number} id_usuario
   * @param {string} motivoAnulacion
   * @returns {Promise}
   */
  async anularFacturasTodas(id_usuario, motivoAnulacion) {
    try {
      const response = await api.post('/factura/anularfacturastodas', {
        id_usuario,
        motivoAnulacion: motivoAnulacion.toUpperCase(),
      });
      return response.data;
    } catch (error) {
      console.error('Error al anular todas las facturas:', error);
      throw error;
    }
  },

  /**
   * Anular facturas seleccionadas
   * @param {number} id_factura
   * @param {string} motivoAnulacion
   * @returns {Promise}
   */
  async anularFacturasSeleccionadas(id_factura, motivoAnulacion) {
    try {
      const response = await api.post('/factura/anularfacturasseleccionadas', {
        id_factura,
        motivoAnulacion: motivoAnulacion.toUpperCase(),
      });
      return response.data;
    } catch (error) {
      console.error('Error al anular facturas seleccionadas:', error);
      throw error;
    }
  },

  /**
   * Listado de anulaciones de factura
   * @returns {Promise}
   */
  async listadoAnulacionesFactura() {
    try {
      const response = await api.get('/factura/listadoAnulacionesFactura');
      return response.data;
    } catch (error) {
      console.error('Error al obtener listado de anulaciones:', error);
      throw error;
    }
  },

  /**
   * Verificar anulación
   * @param {number} id_factura
   * @returns {Promise}
   */
  async verificacionAnulacion(id_factura) {
    try {
      const response = await api.get(`/factura/verificacionanulacion?id_factura=${id_factura}`);
      return response.data;
    } catch (error) {
      console.error('Error al verificar anulación:', error);
      throw error;
    }
  },

  /**
   * Cancelar anulación
   * @param {number} id_factura
   * @param {string} motivo
   * @returns {Promise}
   */
  async cancelarAnulacion(id_factura, motivo) {
    try {
      const response = await api.post('/factura/cancelarAnulacion', {
        id_factura,
        motivoAnulacion: motivo,
      });
      return response.data;
    } catch (error) {
      console.error('Error al cancelar anulación:', error);
      throw error;
    }
  },

  // ─── COBRADAS ─────────────────────────────────────────────────────────────
  /**
   * Obtener suma de cobradas por guía
   * @param {number} id_guia
   * @returns {Promise}
   */
  async facturaidguicobradasuma(id_guia) {
    try {
      const response = await api.get(`/factura/facturaidguicobradasuma?id_guia=${id_guia}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener suma cobradas por guía:', error);
      throw error;
    }
  },

  /**
   * Obtener suma de cobradas por factura
   * @param {number} id_factura
   * @returns {Promise}
   */
  async facturaidfacturacobradasuma(id_factura) {
    try {
      const response = await api.get(`/factura/facturaidfacturacobradasuma?id_factura=${id_factura}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener suma cobradas por factura:', error);
      throw error;
    }
  },

  // ─── PDF ──────────────────────────────────────────────────────────────────
  /**
   * Obtener PDF de factura
   * @param {number} id_factura
   * @returns {Promise}
   */
  async facturaPdf(id_factura) {
    try {
      const response = await api.get(`/factura/facturaPdf?id_factura=${id_factura}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener PDF de factura:', error);
      throw error;
    }
  },

  /**
   * Eliminar documentos
   * @param {string} ruta
   * @returns {Promise}
   */
  async eliminarDocumentos(ruta) {
    try {
      const response = await api.get(`/factura/eliminarDocumentos?ruta=${ruta}`);
      return response.data;
    } catch (error) {
      console.error('Error al eliminar documentos:', error);
      throw error;
    }
  },

  // ─── NO AUTORIZADAS ───────────────────────────────────────────────────────
  /**
   * Obtener facturas no autorizadas
   * @returns {Promise}
   */
  async facturasNoAutorizadas() {
    try {
      const response = await api.post('/factura/facturasNoAutorizadas');
      return response.data;
    } catch (error) {
      console.error('Error al obtener facturas no autorizadas:', error);
      throw error;
    }
  },

  /**
   * Cambio de fecha para autorizar
   * @param {string} fecha_inicio
   * @param {string} fecha_fin
   * @returns {Promise}
   */
  async facturasCambioFechaAutorizar(fecha_inicio, fecha_fin) {
    try {
      const queryParams = new URLSearchParams();
      if (fecha_inicio) queryParams.append('fecha_inicio', fecha_inicio);
      if (fecha_fin) queryParams.append('fecha_fin', fecha_fin);

      const response = await api.get(`/factura/facturasCambioFechaAutorizar?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al cambiar fecha para autorizar:', error);
      throw error;
    }
  },

  // ─── BOLETOS ──────────────────────────────────────────────────────────────
  /**
   * Preparar boleto
   * @param {Object} data
   * @returns {Promise}
   */
  async prepararBoleto(data) {
    try {
      const response = await api.post('/factura/prepararBoleto', data);
      return response.data;
    } catch (error) {
      console.error('Error al preparar boleto:', error);
      throw error;
    }
  },

  /**
   * Registrar autorización
   * @param {Object} data
   * @returns {Promise}
   */
  async registrarAutorizacion(data) {
    try {
      const response = await api.post('/factura/registrarAutorizacion', data);
      return response.data;
    } catch (error) {
      console.error('Error al registrar autorización:', error);
      throw error;
    }
  },
};

export default facturaService;