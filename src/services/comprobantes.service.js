import { api } from '../config/axios';

/**
 * Servicio para Comprobantes
 * Replica toda la lógica del ExtJS ComprobanteController
 */
const comprobantesService = {

  /**
   * Obtener usuario actual desde localStorage (seteado en login)
   */
  getCurrentUser() {
    try {
      const stored = localStorage.getItem('user');
      if (stored) return JSON.parse(stored);
    } catch (_) { /* ignore */ }
    return null;
  },

  /**
   * Anular un comprobante individual
   * @param {Object} record - La fila del grid (id_comprobante_cobro, estado_comprobante_cobro)
   * @param {string} motivo - Motivo de anulación
   * @returns {Promise}
   */
  async anularIndividual(record, motivo) {
    const user = this.getCurrentUser();
    const id_usuario = user?.id_usuario || '';
    const userRole = parseInt(user?.rol_usuario || '0');
    const id_comprobante = record.id_comprobante_cobro;

    // Determinar endpoint según rol (1=admin, 5=superadmin → /anularadministrador; 4=oficinista → /anularoficinista)
    const isAdmin = userRole === 1 || userRole === 5;
    const endpoint = isAdmin
      ? '/comprobantecobro/anularadministrador'
      : '/comprobantecobro/anularoficinista';

    const res = await api.post(endpoint, {
      id_comprobante,
      id_usuario,
      motivoAnulacion: motivo,
    });

    return res.data;
  },

  /**
   * Anular todos los comprobantes pendientes (masivo)
   * @param {string} motivo - Motivo de anulación
   * @returns {Promise}
   */
  async anularPendientes(motivo) {
    const res = await api.post('/comprobantecobro/anularcomprobantestodas', {
      motivoAnulacion: motivo,
    });
    return res.data;
  },

  /**
   * Anular comprobantes seleccionados (masivo)
   * @param {number[]} ids - Array de id_comprobante_cobro
   * @param {string} motivo - Motivo de anulación
   * @returns {Promise}
   */
  async anularSeleccionados(ids, motivo) {
    const res = await api.post('/comprobantecobro/anularcomprobantesseleccionadas', {
      ids: ids.join(','),
      motivoAnulacion: motivo,
    });
    return res.data;
  },

  /**
   * Generar PDF de un comprobante (2 pasos como en ExtJS):
   * 1. Llama al PHP que genera el PDF y lo guarda en tmp/
   * 2. Retorna la URL del archivo PDF generado
   *
   * NOTA: Usa fetch en vez de api porque los PHP los sirve Apache (proxy Vite),
   * no el backend Node. api apunta al puerto 3000 que no sirve PHP.
   * @param {number} id - id_comprobante_cobro
   * @returns {Promise<string>} URL del PDF generado
   */
  async generarPdf(id) {
    const res = await fetch(`/php/comprobantePdf.php?id_comprobante=${id}`);
    const data = await res.json();
    if (data?.success && data?.ruta) {
      const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
      return `${baseUrl}/php/tmp/${data.ruta}`;
    }
    throw new Error(data?.msg || 'No se pudo generar el PDF');
  },

  /**
   * Generar Imagen PDF de cobro (llega desde Cobros)
   * @param {number} id - id_comprobante_cobro
   * @returns {Promise<string>} URL del PDF generado
   */
  async generarPdfCobro(id) {
    const res = await fetch(`/php/pdfImpresionCobro.php?id_comprobante=${id}`);
    const data = await res.json();
    if (data?.success && data?.ruta) {
      const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
      return `${baseUrl}/php/tmp/${data.ruta}`;
    }
    throw new Error(data?.msg || 'No se pudo generar el PDF de cobro');
  },

  /**
   * Generar PDF de comprobante de caja
   * @param {number} idCaja - id_caja
   * @param {string} tipo - 'caja', 'caja_boleteria', 'cajaretenciones'
   * @returns {string} URL del PDF
   */
  getReporteComprobantesUrl(idCaja, tipo = 'caja') {
    return `/${tipo}/reportecomprobantefacturasxcaja?idcaja=${idCaja}`;
  },

};

export default comprobantesService;
