import { api } from '../config/axios';

/**
 * Servicio de Caja Boletería
 * Conecta el frontend React con los endpoints del backend
 * Endpoints: /caja_boleteria/*
 */

export const cajaBoleteriaService = {
  // ─── VALIDACIÓN DE APERTURA ────────────────────────────────────────────────
  /**
   * Verificar si la caja está abierta para el usuario actual
   * @returns {Promise} - { success, data: { id_caja, estado, ... } }
   */
  async validarCaja() {
    try {
      const response = await api.post('/caja_boleteria/validarcaja');
      return response.data;
    } catch (error) {
      console.error('Error al validar caja:', error);
      throw error;
    }
  },

  // ─── APERTURA DE CAJA ─────────────────────────────────────────────────────
  /**
   * Insertar apertura de caja
   * @param {Object} data - Denominaciones de apertura
   * @returns {Promise}
   */
  async insertarAperturaCaja(data) {
    try {
      const response = await api.post('/caja_boleteria/insertarAperturaCaja', {
        id_caja: data.id_caja || null,
        apertura_100_caja: data.apertura_100_caja || 0,
        apertura_50_caja: data.apertura_50_caja || 0,
        apertura_20_caja: data.apertura_20_caja || 0,
        apertura_10_caja: data.apertura_10_caja || 0,
        apertura_5_caja: data.apertura_5_caja || 0,
        apertura_1_caja: data.apertura_1_caja || 0,
        apertura_moneda_caja: data.apertura_moneda_caja || 0,
        apertura_moneda_50_caja: data.apertura_moneda_50_caja || 0,
        apertura_moneda_25_caja: data.apertura_moneda_25_caja || 0,
        apertura_moneda_10_caja: data.apertura_moneda_10_caja || 0,
        apertura_moneda_5_caja: data.apertura_moneda_5_caja || 0,
        apertura_moneda_1_caja: data.apertura_moneda_1_caja || 0,
        apertura_total_caja: data.apertura_total_caja || 0,
      });
      return response.data;
    } catch (error) {
      console.error('Error al insertar apertura de caja:', error);
      throw error;
    }
  },

  // ─── EDICIÓN DE CAJA ──────────────────────────────────────────────────────
  /**
   * Editar caja (apertura + cierre)
   * @param {Object} data - Datos completos de la caja
   * @returns {Promise}
   */
  async editarCaja(data) {
    try {
      const response = await api.post('/caja_boleteria/editarCaja', {
        id_caja: data.id_caja,
        apertura_100_caja: data.apertura_100_caja || 0,
        apertura_50_caja: data.apertura_50_caja || 0,
        apertura_20_caja: data.apertura_20_caja || 0,
        apertura_10_caja: data.apertura_10_caja || 0,
        apertura_5_caja: data.apertura_5_caja || 0,
        apertura_1_caja: data.apertura_1_caja || 0,
        apertura_moneda_caja: data.apertura_moneda_caja || 0,
        apertura_moneda_50_caja: data.apertura_moneda_50_caja || 0,
        apertura_moneda_25_caja: data.apertura_moneda_25_caja || 0,
        apertura_moneda_10_caja: data.apertura_moneda_10_caja || 0,
        apertura_moneda_5_caja: data.apertura_moneda_5_caja || 0,
        apertura_moneda_1_caja: data.apertura_moneda_1_caja || 0,
        apertura_total_caja: data.apertura_total_caja || 0,
        cierre_100_caja: data.cierre_100_caja || 0,
        cierre_50_caja: data.cierre_50_caja || 0,
        cierre_20_caja: data.cierre_20_caja || 0,
        cierre_10_caja: data.cierre_10_caja || 0,
        cierre_5_caja: data.cierre_5_caja || 0,
        cierre_1_caja: data.cierre_1_caja || 0,
        cierre_moneda_caja: data.cierre_moneda_caja || 0,
        cierre_moneda_50_caja: data.cierre_moneda_50_caja || 0,
        cierre_moneda_25_caja: data.cierre_moneda_25_caja || 0,
        cierre_moneda_10_caja: data.cierre_moneda_10_caja || 0,
        cierre_moneda_5_caja: data.cierre_moneda_5_caja || 0,
        cierre_moneda_1_caja: data.cierre_moneda_1_caja || 0,
        cierre_total_caja: data.cierre_total_caja || 0,
      });
      return response.data;
    } catch (error) {
      console.error('Error al editar caja:', error);
      throw error;
    }
  },

  // ─── CIERRE DE CAJA ───────────────────────────────────────────────────────
  /**
   * Cerrar caja
   * @param {Object} data - Denominaciones de cierre
   * @returns {Promise}
   */
  async cerrarCaja(data) {
    try {
      const response = await api.post('/caja_boleteria/cerrarCaja', {
        id_caja: data.id_caja,
        cierre_100_caja: data.cierre_100_caja || 0,
        cierre_50_caja: data.cierre_50_caja || 0,
        cierre_20_caja: data.cierre_20_caja || 0,
        cierre_10_caja: data.cierre_10_caja || 0,
        cierre_5_caja: data.cierre_5_caja || 0,
        cierre_1_caja: data.cierre_1_caja || 0,
        cierre_moneda_caja: data.cierre_moneda_caja || 0,
        cierre_moneda_50_caja: data.cierre_moneda_50_caja || 0,
        cierre_moneda_25_caja: data.cierre_moneda_25_caja || 0,
        cierre_moneda_10_caja: data.cierre_moneda_10_caja || 0,
        cierre_moneda_5_caja: data.cierre_moneda_5_caja || 0,
        cierre_moneda_1_caja: data.cierre_moneda_1_caja || 0,
        cierre_total_caja: data.cierre_total_caja || 0,
      });
      return response.data;
    } catch (error) {
      console.error('Error al cerrar caja:', error);
      throw error;
    }
  },

  // ─── LISTADO DE CAJAS ─────────────────────────────────────────────────────
  /**
   * Obtener listado de cajas con filtros y paginación
   * @param {Object} params - { desde, hasta, estado, page, limit }
   * @returns {Promise} - { success, data, total }
   */
  async listadoCaja(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.desde) queryParams.append('desde', params.desde);
      if (params.hasta) queryParams.append('hasta', params.hasta);
      if (params.estado) queryParams.append('estado', params.estado);
      queryParams.append('page', params.page || 1);
      queryParams.append('limit', params.limit || 25);

      const response = await api.get(`/caja_boleteria/listadoCaja?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener listado de cajas:', error);
      throw error;
    }
  },

  // ─── DETALLE DE CAJA ──────────────────────────────────────────────────────
  /**
   * Insertar detalle de caja (ingreso/egreso)
   * @param {Object} data - { tipo_caja_detalle, monto_caja_detalle, observacion_caja_detalle, id_fkcaja, nombre_socio, numero_documento }
   * @returns {Promise}
   */
  async insertarDetalleCaja(data) {
    try {
      const response = await api.post('/caja_boleteria/detallecaja', {
        id_caja_detalle: data.id_caja_detalle || 0,
        tipo_caja_detalle: data.tipo_caja_detalle || 0,
        monto_caja_detalle: data.monto_caja_detalle || 0,
        observacion_caja_detalle: data.observacion_caja_detalle || '',
        id_fkcaja: data.id_fkcaja || 0,
        nombre_socio: data.nombre_socio || '',
        numero_documento: data.numero_documento || '',
      });
      return response.data;
    } catch (error) {
      console.error('Error al insertar detalle de caja:', error);
      throw error;
    }
  },

  /**
   * Obtener listado de detalle de caja
   * @param {Object} params - { id_caja, page, limit }
   * @returns {Promise}
   */
  async listadoDetalleCaja(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      queryParams.append('id_caja', params.id_caja || 0);
      queryParams.append('page', params.page || 1);
      queryParams.append('limit', params.limit || 25);

      const response = await api.get(`/caja_boleteria/listadodetallecaja?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener detalle de caja:', error);
      throw error;
    }
  },

  /**
   * Obtener detalle de caja pendientes
   * @param {Object} params - { tipo, monto, mes, anio, desde, hasta, page, limit }
   * @returns {Promise}
   */
  async listadoDetalleCajaPendientes(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.tipo) queryParams.append('tipo', params.tipo);
      if (params.monto) queryParams.append('monto', params.monto);
      if (params.mes) queryParams.append('mes', params.mes);
      if (params.anio) queryParams.append('anio', params.anio);
      if (params.desde) queryParams.append('desde', params.desde);
      if (params.hasta) queryParams.append('hasta', params.hasta);
      queryParams.append('page', params.page || 1);
      queryParams.append('limit', params.limit || 25);

      const response = await api.get(`/caja_boleteria/listadodetallecajaPendientes?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener detalle de caja pendientes:', error);
      throw error;
    }
  },

  // ─── APROBACIONES ─────────────────────────────────────────────────────────
  /**
   * Listado de detalle de caja para aprobación
   * @param {Object} params - { fecha, usuario, page, limit }
   * @returns {Promise}
   */
  async listadoDetalleCajaAprobacion(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.fecha) queryParams.append('fecha', params.fecha);
      if (params.usuario) queryParams.append('usuario', params.usuario);
      queryParams.append('page', params.page || 1);
      queryParams.append('limit', params.limit || 25);

      const response = await api.get(`/caja_boleteria/listadodetallecajaAprobacion?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener aprobaciones de caja:', error);
      throw error;
    }
  },

  /**
   * Aprobar detalle de caja
   * @param {number} id_caja_detalle
   * @returns {Promise}
   */
  async aprobarDetalleCaja(id_caja_detalle) {
    try {
      const response = await api.post('/caja_boleteria/aprobarDetalleCaja', { id_caja_detalle });
      return response.data;
    } catch (error) {
      console.error('Error al aprobar detalle de caja:', error);
      throw error;
    }
  },

  /**
   * Cancelar detalle de caja
   * @param {number} id_caja_detalle
   * @param {string} motivo
   * @returns {Promise}
   */
  async cancelarDetalleCaja(id_caja_detalle, motivo) {
    try {
      const response = await api.post('/caja_boleteria/cancelarDetalleCaja', {
        id_caja_detalle,
        motivoAnulacion: motivo,
      });
      return response.data;
    } catch (error) {
      console.error('Error al cancelar detalle de caja:', error);
      throw error;
    }
  },

  /**
   * Eliminar detalle de caja
   * @param {number} id_caja_detalle
   * @returns {Promise}
   */
  async eliminarDetalleCaja(id_caja_detalle) {
    try {
      const response = await api.post('/caja_boleteria/eliminarDetalleCaja', { id_caja_detalle });
      return response.data;
    } catch (error) {
      console.error('Error al eliminar detalle de caja:', error);
      throw error;
    }
  },

  // ─── CUADRE E INFORMACIÓN ─────────────────────────────────────────────────
  /**
   * Verificar cuadre de caja
   * @param {number} id_caja
   * @returns {Promise}
   */
  async verificarCuadreCaja(id_caja) {
    try {
      const response = await api.get(`/caja_boleteria/verificarCuadreCaja?id_caja=${id_caja}`);
      return response.data;
    } catch (error) {
      console.error('Error al verificar cuadre de caja:', error);
      throw error;
    }
  },

  /**
   * Obtener información de caja
   * @param {number} id_caja
   * @returns {Promise}
   */
  async informacionCaja(id_caja) {
    try {
      const response = await api.get(`/caja_boleteria/informacionCaja?id_caja=${id_caja}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener información de caja:', error);
      throw error;
    }
  },

  // ─── SOLICITUDES ──────────────────────────────────────────────────────────
  /**
   * Enviar solicitud de edición
   * @param {number} id_caja
   * @returns {Promise}
   */
  async enviarSolicitudEdicion(id_caja) {
    try {
      const response = await api.get(`/caja_boleteria/enviarSolicituEdicion?id_caja=${id_caja}`);
      return response.data;
    } catch (error) {
      console.error('Error al enviar solicitud de edición:', error);
      throw error;
    }
  },

  /**
   * Aprobar solicitud
   * @param {number} id_caja
   * @returns {Promise}
   */
  async aprobarSolicitud(id_caja) {
    try {
      const response = await api.post('/caja_boleteria/aprobarSolicitud', { id_caja });
      return response.data;
    } catch (error) {
      console.error('Error al aprobar solicitud:', error);
      throw error;
    }
  },

  // ─── VERIFICACIÓN DE FACTURAS ─────────────────────────────────────────────
  /**
   * Verificar facturas sincronizadas
   * @returns {Promise}
   */
  async verificarFacturasSincronizada() {
    try {
      const response = await api.get('/caja_boleteria/verificarFacturasSincronizada');
      return response.data;
    } catch (error) {
      console.error('Error al verificar facturas sincronizadas:', error);
      throw error;
    }
  },

  // ─── PDF ──────────────────────────────────────────────────────────────────
  /**
   * Obtener PDF de arqueo de caja
   * @param {number} id_caja
   * @returns {Promise} - { success, html }
   */
  async arqueoCajaPdf(id_caja) {
    try {
      const response = await api.get(`/caja_boleteria/arqueoCajaPdf?id_caja=${id_caja}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener PDF de arqueo:', error);
      throw error;
    }
  },

  /**
   * Obtener PDF de detalle de caja
   * @param {number} id_caja_detalle
   * @returns {Promise}
   */
  async mostarCajaDetallePdf(id_caja_detalle) {
    try {
      const response = await api.get(`/caja_boleteria/mostarCajaDetallePdf?id_caja_detalle=${id_caja_detalle}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener PDF de detalle:', error);
      throw error;
    }
  },

  // ─── REPORTE ──────────────────────────────────────────────────────────────
  /**
   * Reporte de comprobantes por caja
   * @param {Object} params - { idcaja, oficinista, fechaini, fechalast, mes, anio }
   * @returns {Promise}
   */
  async reporteComprobantesPorCaja(params = {}) {
    try {
      const queryParams = new URLSearchParams();
      if (params.idcaja) queryParams.append('idcaja', params.idcaja);
      if (params.oficinista) queryParams.append('oficinista', params.oficinista);
      if (params.fechaini) queryParams.append('fechaini', params.fechaini);
      if (params.fechalast) queryParams.append('fechalast', params.fechalast);
      if (params.mes) queryParams.append('mes', params.mes);
      if (params.anio) queryParams.append('anio', params.anio);

      const response = await api.get(`/caja_boleteria/reportecomprobantefacturasxcaja?${queryParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error('Error al obtener reporte de comprobantes:', error);
      throw error;
    }
  },

  // ─── ANULACIONES ──────────────────────────────────────────────────────────
  /**
   * Solicitar anulación de egreso
   * @param {number} id_egreso
   * @param {string} motivo
   * @returns {Promise}
   */
  async solicitudAnulacion(id_egreso, motivo) {
    try {
      const response = await api.post('/caja_boleteria/solicitudAnulacion', {
        id_egreso,
        motivoAnulacion: motivo,
      });
      return response.data;
    } catch (error) {
      console.error('Error al solicitar anulación:', error);
      throw error;
    }
  },

  /**
   * Cancelar anulación de egreso
   * @param {number} id_egreso
   * @param {string} motivo
   * @returns {Promise}
   */
  async cancelarAnulacion(id_egreso, motivo) {
    try {
      const response = await api.post('/caja_boleteria/cancelarAnulacion', {
        id_egreso,
        motivoAnulacion: motivo,
      });
      return response.data;
    } catch (error) {
      console.error('Error al cancelar anulación:', error);
      throw error;
    }
  },

  /**
   * Anular todos los egresos
   * @param {string} motivo
   * @returns {Promise}
   */
  async anularEgresosTodas(motivo) {
    try {
      const response = await api.post('/caja_boleteria/anularegresostodas', {
        motivoAnulacion: motivo,
      });
      return response.data;
    } catch (error) {
      console.error('Error al anular todos los egresos:', error);
      throw error;
    }
  },

  /**
   * Anular egresos seleccionados
   * @param {number} id_egreso
   * @param {string} motivo
   * @returns {Promise}
   */
  async anularEgresosSeleccionadas(id_egreso, motivo) {
    try {
      const response = await api.post('/caja_boleteria/anularegresosseleccionadas', {
        id_egreso,
        motivoAnulacion: motivo,
      });
      return response.data;
    } catch (error) {
      console.error('Error al anular egresos seleccionados:', error);
      throw error;
    }
  },

  /**
   * Guardar información de comprobante
   * @param {Object} data
   * @returns {Promise}
   */
  async guardarInfoComprobante(data) {
    try {
      const response = await api.post('/caja_boleteria/guardarInfoComprobante', data);
      return response.data;
    } catch (error) {
      console.error('Error al guardar info comprobante:', error);
      throw error;
    }
  },
};

export default cajaBoleteriaService;