import axios from 'axios';
import { api } from '../config/axios';
import { CONFIG } from '../config/env';

/** Obtiene la URL base correcta desde la sesión o fallback */
function getBaseApiUrl() {
  return CONFIG.API_URL || '';
}

/**
 * Para POST con datos JSON, usar axios directo (no api).
 * El interceptor de api convierte POST a form-urlencoded, lo que rompe objetos anidados.
 */
function getQueueUrl(path) {
  const baseUrl = getBaseApiUrl();
  return baseUrl ? `${baseUrl}/api/reportes/queue${path}` : `/api/reportes/queue${path}`;
}

/**
 * Servicio de Reportes
 * Conecta el frontend React con los endpoints del backend
 */

// ─── REPORTE GUÍAS ENTREGADAS ──────────────────────────────────────────────
export const reportesService = {
  /**
   * Obtener reporte de guías entregadas/no entregadas
   * @param {Object} filtros - { estado, desde, hasta, oficina }
   * @returns {Promise} - { success, data, total }
   */
  async getGuiasEntregadas(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.desde) params.append('desde', filtros.desde);
      if (filtros.hasta) params.append('hasta', filtros.hasta);
      if (filtros.oficina) params.append('oficina', filtros.oficina);

      const response = await api.get(
        `/reportes/guiasEntregadas?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error al obtener guías entregadas:', error);
      throw error;
    }
  },

  /**
   * Generar PDF de guías entregadas
   * @param {Object} filtros - { estado, desde, hasta, oficina }
   * @returns {Promise} - { success, html, total, empresa }
   */
  async getGuiasEntregadasPdf(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.desde) params.append('desde', filtros.desde);
      if (filtros.hasta) params.append('hasta', filtros.hasta);
      if (filtros.oficina) params.append('oficina', filtros.oficina);

      const response = await api.get(
        `/reportes/guiasEntregadasPdf?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error al generar PDF de guías entregadas:', error);
      throw error;
    }
  },

  // ─── REPORTE INGRESO/EGRESO ──────────────────────────────────────────────
  /**
   * Obtener reporte de ingreso/egreso
   * @param {Object} filtros - { estado, mes, anio, desde, hasta }
   * @returns {Promise} - { success, data, totales }
   */
  async getIngresoEgreso(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.mes) params.append('mes', filtros.mes);
      if (filtros.anio) params.append('anio', filtros.anio);
      if (filtros.desde) params.append('desde', filtros.desde);
      if (filtros.hasta) params.append('hasta', filtros.hasta);

      // TODO: Implementar endpoint en backend
      // Por ahora usar datos de ejemplo
      const response = await api.get(
        `/reportes/ingresoEgreso?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error al obtener reporte ingreso/egreso:', error);
      // Retornar datos de ejemplo si el endpoint no existe aún
      return {
        success: true,
        data: [],
        totales: { ingresos: 0, egresos: 0, saldo: 0 }
      };
    }
  },

  /**
   * Generar PDF de ingreso/egreso
   * @param {Object} filtros - { estado, mes, anio, desde, hasta }
   * @returns {Promise} - { success, html, totales }
   */
  async getIngresoEgresoPdf(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.estado) params.append('estado', filtros.estado);
      if (filtros.mes) params.append('mes', filtros.mes);
      if (filtros.anio) params.append('anio', filtros.anio);
      if (filtros.desde) params.append('desde', filtros.desde);
      if (filtros.hasta) params.append('hasta', filtros.hasta);

      // TODO: Implementar endpoint en backend
      const response = await api.get(
        `/reportes/ingresoEgresoPdf?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error al generar PDF de ingreso/egreso:', error);
      throw error;
    }
  },

  // ─── REPORTE GUÍAS ───────────────────────────────────────────────────────
  /**
   * Obtener reporte de guías
   * @param {Object} filtros - { idsucursal, idusuario, fechaini, fechalast, mes, anio, cobrada }
   * @returns {Promise}
   */
  async getReporteGuias(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.idsucursal) params.append('idsucursal', filtros.idsucursal);
      if (filtros.idusuario) params.append('idusuario', filtros.idusuario);
      if (filtros.fechaini) params.append('fechaini', filtros.fechaini);
      if (filtros.fechalast) params.append('fechalast', filtros.fechalast);
      if (filtros.mes) params.append('mes', filtros.mes);
      if (filtros.anio) params.append('anio', filtros.anio);
      if (filtros.cobrada) params.append('cobrada', filtros.cobrada);

      const response = await api.get(
        `/reportes/reporteguias?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error al obtener reporte de guías:', error);
      throw error;
    }
  },

  /**
   * Generar PDF de reporte de guías
   * @param {Object} filtros
   * @returns {Promise}
   */
  async getReporteGuiasPdf(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.idsucursal) params.append('idsucursal', filtros.idsucursal);
      if (filtros.idusuario) params.append('idusuario', filtros.idusuario);
      if (filtros.fechaini) params.append('fechaini', filtros.fechaini);
      if (filtros.fechalast) params.append('fechalast', filtros.fechalast);
      if (filtros.mes) params.append('mes', filtros.mes);
      if (filtros.anio) params.append('anio', filtros.anio);
      if (filtros.cobrada) params.append('cobrada', filtros.cobrada);

      const response = await api.get(
        `/reportes/reporteguiaspdf?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error al generar PDF de guías:', error);
      throw error;
    }
  },

  // ─── REPORTE FACTURAS ────────────────────────────────────────────────────
  /**
   * Obtener reporte de facturas
   * @param {Object} filtros - { idsucursal, idusuario, fechaini, fechalast, mes, anio }
   * @returns {Promise}
   */
  async getReporteFacturas(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.idsucursal) params.append('idsucursal', filtros.idsucursal);
      if (filtros.idusuario) params.append('idusuario', filtros.idusuario);
      if (filtros.fechaini) params.append('fechaini', filtros.fechaini);
      if (filtros.fechalast) params.append('fechalast', filtros.fechalast);
      if (filtros.mes) params.append('mes', filtros.mes);
      if (filtros.anio) params.append('anio', filtros.anio);

      const response = await api.get(
        `/reportes/reportesfacturas?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error al obtener reporte de facturas:', error);
      throw error;
    }
  },

  // ─── REPORTE COMPROBANTES ────────────────────────────────────────────────
  /**
   * Generar PDF de comprobantes
   * @param {Object} filtros - { idsucursal, idusuario, fechaini, fechalast, mes, anio, id_forma_pago }
   * @returns {Promise}
   */
  async getReporteComprobantePdf(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.idsucursal) params.append('idsucursal', filtros.idsucursal);
      if (filtros.idusuario) params.append('idusuario', filtros.idusuario);
      if (filtros.fechaini) params.append('fechaini', filtros.fechaini);
      if (filtros.fechalast) params.append('fechalast', filtros.fechalast);
      if (filtros.mes) params.append('mes', filtros.mes);
      if (filtros.anio) params.append('anio', filtros.anio);
      if (filtros.id_forma_pago) params.append('id_forma_pago', filtros.id_forma_pago);

      const response = await api.get(
        `/reportes/reporteComprobantePdf?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error al generar PDF de comprobantes:', error);
      throw error;
    }
  },

  // ─── REPORTE DESPACHO ────────────────────────────────────────────────────
  /**
   * Generar PDF de despacho
   * @param {Object} filtros - { id_oficinista, id_bus, fechaini, fechalast, mes, anio }
   * @returns {Promise}
   */
  async getReporteDespachoPdf(filtros = {}) {
    try {
      const params = new URLSearchParams();
      if (filtros.id_oficinista) params.append('id_oficinista', filtros.id_oficinista);
      if (filtros.id_bus) params.append('id_bus', filtros.id_bus);
      if (filtros.fechaini) params.append('fechaini', filtros.fechaini);
      if (filtros.fechalast) params.append('fechalast', filtros.fechalast);
      if (filtros.mes) params.append('mes', filtros.mes);
      if (filtros.anio) params.append('anio', filtros.anio);

      const response = await api.get(
        `/reportes/reporteDespachoPdf?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error al generar PDF de despacho:', error);
      throw error;
    }
  },

  // ─── COLA DE REPORTES (jobs en segundo plano) ──────────────────────────────
  /**
   * Encolar un reporte para procesamiento en segundo plano
   * @param {string} tipo - Tipo de reporte (guias_entregadas, guias_entregadas_pdf, reporteguias, etc.)
   * @param {Object} params - Parámetros del reporte
   * @returns {Promise} - { success, jobId }
   */
  async enqueueReport(tipo, params = {}) {
    try {
      const url = getQueueUrl('');
      // Usar axios directo para POST (el interceptor de api convierte a form-urlencoded)
      // Pero agregar el token JWT manualmente (el interceptor de api lo haría, pero no lo usamos)
      const token = sessionStorage.getItem('auth_token');
      const response = await axios.post(url, { tipo, params }, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      return response.data;
    } catch (error) {
      console.error('Error al encolar reporte:', error);
      throw error;
    }
  },

  /**
   * Consultar el estado de un job en la cola
   * @param {string} jobId - ID del job
   * @returns {Promise} - { success, data: { jobId, status, progress, ... } }
   */
  async getJobStatus(jobId) {
    try {
      const url = getQueueUrl(`/${jobId}`);
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error al consultar estado del job:', error);
      throw error;
    }
  },

  /**
   * Descargar el resultado de un job completado
   * @param {string} jobId - ID del job
   * @returns {Promise} - { success, data/html/total, ... }
   */
  async getJobResult(jobId) {
    try {
      const url = getQueueUrl(`/${jobId}/download`);
      const response = await api.get(url);
      return response.data;
    } catch (error) {
      console.error('Error al descargar resultado del job:', error);
      throw error;
    }
  },

  /**
   * Encolar un reporte y esperar a que termine (con polling de progreso)
   * @param {string} tipo - Tipo de reporte
   * @param {Object} params - Parámetros del reporte
   * @param {Function} onProgress - Callback (percent, message) para actualizar progreso
   * @param {number} intervalMs - Intervalo de polling en ms (default: 1000)
   * @param {number} maxWaitMs - Tiempo máximo de espera en ms (default: 120000 = 2 min)
   * @returns {Promise} - Resultado del reporte
   */
  async enqueueAndWait(tipo, params = {}, onProgress = null, intervalMs = 1000, maxWaitMs = 120000) {
    const { success, jobId } = await this.enqueueReport(tipo, params);
    if (!success) throw new Error('No se pudo encolar el reporte');

    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const checkStatus = async () => {
        try {
          const elapsed = Date.now() - startTime;
          if (elapsed > maxWaitMs) {
            reject(new Error('Tiempo de espera agotado para el reporte'));
            return;
          }

          const statusResponse = await this.getJobStatus(jobId);
          const job = statusResponse.data;

          if (onProgress && job.progress) {
            onProgress(job.progress.percent || 0, job.progress.message || '');
          }

          if (job.status === 'completed') {
            const result = await this.getJobResult(jobId);
            resolve(result);
            return;
          }

          if (job.status === 'failed') {
            reject(new Error(job.error || 'Error al generar el reporte'));
            return;
          }

          // Sigue procesando, esperar y volver a consultar
          setTimeout(checkStatus, intervalMs);
        } catch (err) {
          reject(err);
        }
      };

      checkStatus();
    });
  },

  // ─── UTILIDADES ──────────────────────────────────────────────────────────
  /**
   * Generar PDF a partir de HTML
   * @param {string} html - Contenido HTML
   * @param {string} titulo - Título del PDF
   */
  async generatePdfFromHtml(html, titulo = 'Reporte') {
    try {
      // Usar jspdf y html2canvas para generar PDF en el frontend
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      const element = document.createElement('div');
      element.innerHTML = html;
      document.body.appendChild(element);

      const canvas = await html2canvas(element);
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${titulo}.pdf`);

      document.body.removeChild(element);
      
      return { success: true, message: 'PDF generado correctamente' };
    } catch (error) {
      console.error('Error al generar PDF:', error);
      throw error;
    }
  }
};

export default reportesService;