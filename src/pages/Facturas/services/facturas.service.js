import { api } from '../../../config/axios';

export const FacturasService = {
  listar: async (params = {}) => {
    const response = await api.get('/factura/facturalistado', { params });
    return response.data;
  },

  listarPendientes: async (params = {}) => {
    const response = await api.get('/factura/facturalistadoPendientes', { params });
    return response.data;
  },

  anular: async (id_factura, motivoAnulacion, id_usuario) => {
    const response = await api.post('/factura/anularoficinista', {
      id_factura,
      motivoAnulacion,
      id_usuario
    });
    return response.data;
  },

  anularAdmin: async (id_factura, motivoAnulacion, id_usuario) => {
    const response = await api.post('/factura/anularadministrador', {
      id_factura,
      motivoAnulacion,
      id_usuario
    });
    return response.data;
  },

  anularPendientes: async (motivoAnulacion, id_usuario) => {
    const response = await api.post('/factura/anularfacturastodas', {
      motivoAnulacion,
      id_usuario
    });
    return response.data;
  },

  anularSeleccionadas: async (id_factura, motivoAnulacion) => {
    const response = await api.post('/factura/anularfacturasseleccionadas', {
      id_factura,
      motivoAnulacion
    });
    return response.data;
  },

  verificarAnulacion: async (id_factura) => {
    const response = await api.get('/factura/verificacionanulacion', {
      params: { id_factura }
    });
    return response.data;
  },

  getPdf: async (id_factura) => {
    const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
    window.open(`${baseUrl}/php/facturaPdf.php?id_factura=${id_factura}`, '_blank');
  },

  getComboUsuarios: async () => {
    const response = await api.get('/usuario/usuarioSeleccionarCombo');
    return response.data;
  },

  autorizarProceso: async () => {
    const response = await api.post('/factura/facturasNoAutorizadas');
    return response.data;
  },

  reenviarSri: async (id_factura) => {
    const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
    window.open(`${baseUrl}/php/negocioXmlFacturaData.php?id_factura=${id_factura}`, '_blank');
  }
};
