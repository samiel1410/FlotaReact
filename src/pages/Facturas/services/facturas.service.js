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

  autorizarFactura: async (id_factura, estado, mensaje) => {
    const response = await api.post('/factura/registrarAutorizacion', {
      id_factura,
      estado,
      mensaje
    });
    return response.data;
  },

  prepararFacturaSRI: async (id_factura) => {
    try {
      const response = await api.post('/factura/prepararFactura', { id_factura });
      return response.data;
    } catch {
      return { success: false };
    }
  },

  reenviarSri: async (id_factura) => {
    const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
    const { CONFIG } = await import('../../../config/env');

    // 0. Preparar la factura (actualizar fecha y generar clave de acceso de 49 dígitos si aplica)
    await FacturasService.prepararFacturaSRI(id_factura);

    // 1. Obtener XML de la factura
    const resPhp = await fetch(`${baseUrl}/php/negocioXmlFacturaData.php?id_factura=${id_factura}`);
    const dataPhp = await resPhp.json();

    if (!dataPhp.success || !dataPhp.xml) {
      throw new Error('No se pudo generar el XML de la factura');
    }

    // 2. Enviar a la API de firma y SRI
    const responseFirma = await fetch(`${CONFIG.API_FIRMA}/firmar-enviar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xml: dataPhp.xml,
        ruc: dataPhp.ruc,
        clave: dataPhp.p12_password || ''
      })
    });

    const resultFirma = await responseFirma.json();

    // 3. Determinar estado y registrar en la BD
    let estadoSRI = 'RECHAZADO';
    let mensajeRes = resultFirma.message || 'Error en proceso SRI';

    if (resultFirma.success) {
      if (resultFirma.estado === 'RECIBIDA') {
        estadoSRI = 'RECIBIDA';
        mensajeRes = resultFirma.message || 'Comprobante recibido, pendiente de autorización';
      } else if (resultFirma.estado === 'DEVUELTA') {
        const msgs = resultFirma.infoRecepcion?.mensajes || resultFirma.detalles?.mensajes;
        const msgsText = Array.isArray(msgs) ? msgs.join(' | ') : (resultFirma.message || '');
        if (/ERROR SECUENCIAL REGISTRADO|identificador.*45/i.test(msgsText)) {
          estadoSRI = 'AUTORIZADO';
          mensajeRes = 'Comprobante autorizado por el SRI (Secuencial ya registrado previamente)';
        } else {
          estadoSRI = 'DEVUELTA';
          mensajeRes = msgsText || 'DEVUELTA por el SRI';
        }
      } else {
        estadoSRI = 'AUTORIZADO';
        mensajeRes = 'Comprobante autorizado por el SRI';
      }
    } else {
      const msgsText = JSON.stringify(resultFirma);
      if (/ERROR SECUENCIAL REGISTRADO/i.test(msgsText)) {
        estadoSRI = 'AUTORIZADO';
        mensajeRes = 'Comprobante autorizado por el SRI (Secuencial ya registrado previamente)';
      } else if (resultFirma.autorizacion) {
        estadoSRI = resultFirma.autorizacion.estado || 'RECHAZADO';
        mensajeRes = resultFirma.autorizacion.mensaje || resultFirma.autorizacion.infoAdicional || resultFirma.message;
      }
    }

    await FacturasService.autorizarFactura(id_factura, estadoSRI, mensajeRes);
    return { success: resultFirma.success, estado: estadoSRI, mensaje: mensajeRes, resultFirma };
  }
};
