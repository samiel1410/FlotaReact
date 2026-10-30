import { api } from '../config/axios';
import { CONFIG } from '../config/env';
import { buildPdfUrl } from '../utils/pdfUrlUtils';

/**
 * Abre un PDF de entrega en una ventana nueva. Si el navegador bloquea el
 * popup (la generación es asíncrona), lo abre con un enlace temporal.
 */
export const abrirPdfEntrega = (url) => {
  if (!url) return;
  const w = window.open(url, 'PDF_Entrega', 'width=900,height=700');
  if (w) return;

  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
};

/**
 * Servicio para interactuar con el backend de Entregas de Guías
 */
export const EntregaService = {

  /**
   * Listado paginado de guías para entrega
   */
  listar: async (params = {}, isNotaVenta = false) => {
    const prefix = isNotaVenta ? '/guia_nota_venta' : '/guia';
    const response = await api.get(`${prefix}/guialistadoEntrega`, { params });
    return response.data;
  },

  /**
   * Verificar si guía está anulada
   */
  verificarAnulacion: async (idGuia, isNotaVenta = false) => {
    const prefix = isNotaVenta ? '/guia_nota_venta' : '/guia';
    const response = await api.get(`${prefix}/verificacionanulacion`, { params: { id_guia: idGuia } });
    return response.data;
  },

  /**
   * Verificar si guía tiene factura autorizada
   */
  autorizadoFacturaPorGuia: async (idGuia) => {
    const response = await api.get('/factura/autorizadofacturaxguia', { params: { id_guia: idGuia } });
    return response.data;
  },

  /**
   * Obtener suma cobrada de factura por guía
   */
  facturaidguicobradasuma: async (idGuia) => {
    const response = await api.get('/factura/facturaidguicobradasuma', { params: { id_guia: idGuia } });
    return response.data;
  },

  /**
   * Validar si hay caja aperturada
   */
  validarCaja: async () => {
    const response = await api.post('/Caja/validarcaja');
    return response.data;
  },

  /**
   * Obtener usuario actual (con nombre_oficina)
   */
  buscarUsuario: async () => {
    const response = await api.get('/buscarUsuario');
    return response.data;
  },

  /**
   * Registrar comprobante de cobro
   */
  insertarComprobante: async (payload) => {
    const response = await api.post('/comprobantecobro/comprobanteCobroInsertarActualizar', payload);
    return response.data;
  },

  /**
   * Entregar guía con foto (cédula de quien recibe + foto opcional)
   */
  entregarGuiaConFoto: async (payload, isNotaVenta = false) => {
    const prefix = isNotaVenta ? '/guia_nota_venta' : '/guia';
    const response = await api.post(`${prefix}/entregarGuiaConFoto`, payload);
    return response.data;
  },

  /**
   * Generar PDF de guía entregada (PHP).
   *
   * El script PHP (`guiaEntregadaPdf.php`) entrega el PDF directamente
   * (`Output(..., 'I')`), no un JSON con la ruta del archivo. Antes se hacía
   * `r.json()`, lo que lanzaba un error y el comprobante nunca se imprimía.
   * También soporta el formato antiguo `{ success, ruta }` por si el servidor
   * todavía devuelve la ruta en `tmp/`.
   *
   * @returns {Promise<{success: boolean, url?: string, ruta?: string, message?: string}>}
   */
  generarPdfEntrega: async (idGuia, idUsuario, isNotaVenta = false) => {
    const phpScript = isNotaVenta ? 'guiaEntregadaNotaVentaPdf.php' : 'guiaEntregadaPdf.php';
    const rawUrl = `${CONFIG.PHP_URL}/${phpScript}?id_guia=${encodeURIComponent(idGuia)}&id_usuario=${encodeURIComponent(idUsuario)}`;
    const phpUrl = buildPdfUrl(rawUrl);

    // Si el PHP vive en otro origin, el fetch no comparte la sesión (de ahí
    // salen los PDF de otro tenant). En ese caso se abre la URL directa.
    try {
      if (new URL(phpUrl, window.location.href).origin !== window.location.origin) {
        return { success: true, url: phpUrl, directo: true };
      }
    } catch (e) { /* URL relativa válida */ }

    try {
      const r = await fetch(phpUrl, { credentials: 'same-origin' });
      const contentType = (r.headers.get('content-type') || '').toLowerCase();

      // El PHP devuelve el PDF como archivo (stream directo).
      if (contentType.includes('application/pdf')) {
        const blob = await r.blob();
        return { success: true, url: URL.createObjectURL(blob), tipo: 'pdf' };
      }

      const texto = await r.text();
      try {
        const data = JSON.parse(texto);
        if (data?.error || data?.success === false) {
          return { success: false, message: data.error || data?.message || 'No se pudo generar el PDF de entrega' };
        }
        if (data?.ruta) {
          return { success: true, ruta: data.ruta, url: `${CONFIG.PHP_URL}/tmp/${data.ruta}`, tipo: 'ruta' };
        }
      } catch (e) {
        // Respuesta no JSON (HTML de error del servidor).
      }

      if (!r.ok) {
        return { success: false, message: `No se pudo generar el PDF (HTTP ${r.status})` };
      }

      // Respuesta no reconocida: se abre la URL directa.
      return { success: true, url: phpUrl, directo: true };
    } catch (err) {
      console.warn('No se pudo previsualizar el PDF, se abre la URL directa:', err?.message || err);
      return { success: true, url: phpUrl, directo: true };
    }
  },

  /**
   * Obtener formas de pago para combo
   */
  getFormasPago: async () => {
    const response = await api.get('/formapago/formapagoSeleccionPaginadoCombo');
    return response.data;
  },

  /**
   * Buscar guía por ID para obtener datos completos
   */
  buscarGuiaPorId: async (idGuia, isNotaVenta = false) => {
    const prefix = isNotaVenta ? '/guia_nota_venta' : '/guia';
    const response = await api.get(`${prefix}/buscarGuiaId`, { params: { id_guia: idGuia } });
    return response.data;
  },

  /**
   * Resumen de entregas por oficina (registradas / entregadas / por entregar).
   * Solo disponible para guías normales.
   */
  resumen: async (params = {}) => {
    const response = await api.get('/guia/resumenEntregas', { params });
    return response.data;
  }
};
