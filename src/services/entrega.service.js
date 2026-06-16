import { api } from '../config/axios';
import { CONFIG } from '../config/env';

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
   * Generar PDF de guía entregada (PHP)
   */
  generarPdfEntrega: async (idGuia, idUsuario, isNotaVenta = false) => {
    try {
      const phpScript = isNotaVenta ? 'guiaEntregadaNotaVentaPdf.php' : 'guiaEntregadaPdf.php';
      const phpUrl = `${CONFIG.PHP_URL}/${phpScript}?id_guia=${encodeURIComponent(idGuia)}&id_usuario=${encodeURIComponent(idUsuario)}`;
      const r = await fetch(phpUrl, { credentials: 'same-origin' });
      const data = await r.json();
      return data;
    } catch (err) {
      console.error('Error generando PDF entrega:', err);
      throw err;
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
  }
};
