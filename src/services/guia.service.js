import { api, clienteApi } from '../config/axios';

/**
 * Servicio para interactuar con el backend de Guías
 */
export const GuiaService = {
  
  /**
   * Obtiene la lista de guías con paginación y filtros
   */
  getGuias: async (params = {}) => {
    const response = await api.get('/guia/guialistado', { params });
    return response.data;
  },

  /**
   * Inserta una nueva guía
   */
  insertarGuia: async (parametros) => {
    // Enviar como JSON string para evitar que el interceptor convierta a form-urlencoded
    // (que destruye objetos anidados como detalle_guia y comprobante_cobro)
    const response = await api.post('/guia/insertarGuia', JSON.stringify(parametros), {
      headers: { 'Content-Type': 'application/json' }
    });
    return response.data;
  },

  /**
   * Actualiza una guía existente
   */
  actualizarGuia: async (parametros) => {
    const response = await api.post('/guia/actualizarGuia', parametros);
    return response.data;
  },

  /**
   * Busca una guía por ID
   */
  buscarGuiaPorId: async (idGuia) => {
    const response = await api.get('/guia/buscarGuiaId', { params: { id_guia: idGuia } });
    return response.data;
  },

  /**
   * Anula una guía (oficinista)
   */
  anularGuia: async (idGuia, idUsuario, motivo) => {
    const response = await api.post('/guia/anularoficinista', {
      guia: idGuia,
      id_usuario: idUsuario,
      motivoAnulacion: motivo
    });
    return response.data;
  },

  /**
   * Anula guías seleccionadas (administrador)
   */
  anularGuiasSeleccionadas: async (idGuia, idUsuario, motivo) => {
    const response = await api.post('/guia/anularguiasseleccionadas', {
      id_guia: idGuia,
      id_usuario: idUsuario,
      motivoAnulacion: motivo
    });
    return response.data;
  },

  /**
   * Solicitar impresión/PDF
   */
  generarPdf: async (idGuia, reimpresoPor = null) => {
    try {
      const response = await api.get('/guia/crearGuiaPDF', { 
        params: { id_guia: idGuia, reimpreso_por: reimpresoPor } 
      });
      // Si el backend Node devuelve una URL o directorio, devolverla para abrir
      if (response && response.data && (response.data.url || response.data.directorio || response.data.directorio_archivo)) {
        return response.data;
      }
    } catch (err) {
      console.warn('crearGuiaPDF via Node failed, will fallback to PHP print URL', err);
    }

    // Fallback: construir URL hacia el script PHP para impresión directa
    try {
      const phpUrl = `${window.location.origin}/php/guiaPdfImpresion.php?id_guia=${encodeURIComponent(idGuia)}`;
      return { url: phpUrl };
    } catch (err) {
      console.error('Error creando URL de impresión PHP', err);
      throw err;
    }
  },

  descargarGuiaPDF: async (idGuia) => {
    try {
      const response = await api.get('/guia/descargarGuiaPDF', {
        params: { id_guia: idGuia },
        responseType: 'blob'
      });

      // Si el backend Node devuelve un PDF, devolver el blob directamente
      const contentType = response.headers && (response.headers['content-type'] || response.headers['Content-Type']);
      if (contentType && contentType.indexOf('pdf') !== -1) {
        return response.data;
      }

      // Si no viene como PDF (por ejemplo devuelve JSON o ruta), intentar fallback a script PHP
    } catch (err) {
      // continuar con fallback
      console.warn('Node PDF download failed, falling back to PHP generator', err);
    }

    // Fallback: intentar los scripts PHP que generan el PDF (ruta relativa al frontend)
    try {
      const phpUrl = `${window.location.origin}/php/guiaPdf.php?id_guia=${encodeURIComponent(idGuia)}`;
      const r = await fetch(phpUrl, { credentials: 'same-origin' });
      if (!r.ok) throw new Error('PHP PDF generator returned non-OK');
      const blob = await r.blob();
      return blob;
    } catch (err) {
      console.error('Fallback PHP PDF download failed', err);
      throw err;
    }
  },

  /**
   * Información completa de una guía
   */
  informacionGuia: async (idGuia) => {
    const response = await api.get('/guia/informacionGuia', { params: { id_guia: idGuia } });
    return response.data;
  },

  // ── Clientes (usa API de clientesfp) ─────────────────
  buscarClientePorIdentificacion: async (identificacion) => {
    const response = await clienteApi.get('/cliente/clientebusquedaIdentificacion', { 
      params: { identificacion_busqueda: identificacion } 
    });
    return response.data;
  },

  // ── Sucursales / Origen ────────────────────────────────
  getSucursalesCombo: async () => {
    const response = await api.get('/sucursal/comboSucursal');
    return response.data;
  },

  // ── Destinos (tabla destino, NO canton) ────────────────
  getDestinosCombo: async () => {
    const response = await api.get('/destino/destinoSeleccionCombo');
    return response.data;
  },

  // ── Tipo de Envío ──────────────────────────────────────
  getTiposEnvio: async () => {
    const response = await api.get('/tipoenvio/tipoenvioSeleccionPaginadoCombo');
    return response.data;
  },

  // ── Provincias ─────────────────────────────────────────
  getProvinciasCombo: async () => {
    const response = await api.get('/provincia/provinciaSeleccionarCombo');
    return response.data;
  },

  // ── Cantones por provincia ─────────────────────────────
  getCantonesPorProvincia: async (idProvincia) => {
    const response = await api.get('/canton/cantonSeleccionarCombo', { params: { id_provincia: idProvincia } });
    return response.data;
  },

  // ── Rutas ──────────────────────────────────────────────
  getRutasCombo: async () => {
    const response = await api.get('/rutas/rutaSeleccionarCombo');
    return response.data;
  },

  // ── Convenio / Descuento por cliente ───────────────────
  getConvenioCliente: async (identificacion) => {
    const response = await api.get('/convenio/convenioSeleccionarPorCliente', { 
      params: { identificacion_cliente: identificacion } 
    });
    return response.data;
  },

  // ── Último destinatario por remitente (ExtJS: params { cedula }) ──
  getUltimoDestinatarioPorRemitente: async (cedula) => {
    const response = await api.get('/guia/ultimoDestinatarioPorRemitente', { 
      params: { cedula } 
    });
    return response.data;
  },

  // ── Listado para despacho ──────────────────────────────
  getGuiasDespacho: async (params = {}) => {
    const response = await api.get('/guia/guialistadoDespacho', { params });
    return response.data;
  },

  // ── Entrega de guía ────────────────────────────────────
  entregarGuia: async (idGuia, nombreOficina, destinoGuia) => {
    const response = await api.post('/guia/updateguiaentregado', {
      id_guia: idGuia,
      nombre_oficina: nombreOficina,
      destino_guia: destinoGuia
    });
    return response.data;
  },

  // ── Facturar guía ──────────────────────────────────────
  facturarGuia: async (idGuia) => {
    const response = await api.post('/guia/facturarGuia', { id_guia: idGuia });
    return response.data;
  },

  // ── Comprobantes por caja ──────────────────────────────
  getComprobantesPorCaja: async (idGuia, params = {}) => {
    const response = await api.get('/guia/comprobantesxCaja', { 
      params: { id_guia: idGuia, ...params } 
    });
    return response.data;
  },

  // ── Formas de pago ──────────────────────────────────────
  getFormasPagoCombo: async () => {
    const response = await api.get('/formapago/formapagoSeleccionPaginadoCombo');
    return response.data;
  },

  // ── Buscar usuario (para origen = nombre_canton) ──────────
  buscarUsuario: async () => {
    const response = await api.get('/buscarUsuario');
    return response.data;
  },

  // ── Configuración general (forma de pago, tarifa) ─────────
  configuracionSeleccion: async () => {
    const response = await api.get('/configuracion/configuracionSeleccion');
    return response.data;
  },

  // ── Compañía asociada ───────────────────────────────────
  buscarCompaniaPorRuc: async (ruc) => {
    const response = await api.get('/guias_companias/guias_companiasSeleccionarPorRuc', {
      params: { ruc }
    });
    return response.data;
  },

  getCompaniasCombo: async () => {
    const response = await api.get('/guias_companias/guias_companiasSeleccionarCombo');
    return response.data;
  },

  // ── Verificar estado de anulación (Ext JS: verificacionanulacion) ──
  verificarAnulacion: async (idGuia) => {
    const response = await api.get('/guia/verificacionanulacion', { params: { id_guia: idGuia } });
    return response.data;
  },

  // ── Verificar si guía tiene factura autorizada ──
  verificarFacturaAutorizada: async (idGuia) => {
    const response = await api.get('/factura/verificarGuiaFacturaAutorizada', { params: { id_guia: idGuia } });
    return response.data;
  },

  // ── Verificar si existe una factura autorizada para la guía (fallback al endpoint usado por ExtJS)
  autorizadoFacturaPorGuia: async (idGuia) => {
    const response = await api.get('/factura/autorizadofacturaxguia', { params: { id_guia: idGuia } });
    return response.data;
  },

  // ── Anular todas las guías pendientes ──
  anularGuiasTodas: async (idUsuario, motivo) => {
    const response = await api.post('/guia/anularguiastodas', { id_usuario: idUsuario, motivoAnulacion: motivo });
    return response.data;
  },

  // ── Anular guía como administrador ──
  anularAdministrador: async (idGuia, idUsuario, motivo) => {
    const response = await api.post('/guia/anularadministrador', {
      guia: idGuia,
      id_usuario: idUsuario,
      motivoAnulacion: motivo
    });
    return response.data;
  },

  // ── Cancelar anulación ──
  cancelarAnulacion: async (idGuia, motivo) => {
    const response = await api.post('/guia/cancelarAnulacion', { id_guia: idGuia, motivoAnulacion: motivo });
    return response.data;
  }
};
