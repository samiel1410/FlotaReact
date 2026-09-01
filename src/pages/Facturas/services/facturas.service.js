import { api } from '../../../config/axios';

export const FacturasService = {
  listar: async (params = {}) => {
    const response = await api.get('/factura/facturalistado', { 
      params: { ...params, _t: Date.now() } 
    });
    return response.data;
  },

  listarPendientes: async (params = {}) => {
    const response = await api.get('/factura/facturalistadoPendientes', { 
      params: { ...params, _t: Date.now() } 
    });
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
    const { CONFIG } = await import('../../../config/env');
    const { buildPdfUrl } = await import('../../../utils/pdfUrlUtils');
    window.open(buildPdfUrl(`${CONFIG.PHP_URL}/facturaPdf.php?id_factura=${encodeURIComponent(id_factura)}`), '_blank');
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

  reenviarSri: async (id_factura) => {
    const baseUrl = import.meta.env.VITE_URL_BASE || window.location.origin;
    const { CONFIG } = await import('../../../config/env');

    // 1. Obtener XML de la factura (negocioXmlFacturaData.php actualiza la fecha de emisión a HOY y recalcula la clave de acceso)
    const resPhp = await fetch(`${baseUrl}/php/negocioXmlFacturaData.php?id_factura=${id_factura}`);
    const dataPhp = await resPhp.json();

    if (!dataPhp.success || !dataPhp.xml) {
      throw new Error('No se pudo generar el XML de la factura');
    }

    // Obtener información y RUC de la empresa desde configuración (igual que en Boletería)
    let rucEmpresa = dataPhp.ruc || '';
    try {
      const confRes = await api.get('/configuracion/configuracionSeleccion');
      if (confRes.data?.data?.[0]?.ruc_empresa) {
        rucEmpresa = confRes.data.data[0].ruc_empresa;
      }
    } catch (e) {
      console.warn('[Factura Reenviar] No se pudo obtener la configuración:', e);
    }

    // 2. Enviar a la API de firma y SRI
    const responseFirma = await fetch(`${CONFIG.API_FIRMA}/firmar-enviar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        xml: dataPhp.xml,
        ruc: rucEmpresa,
        clave: dataPhp.p12_password || ''
      })
    });

    const resultFirma = await responseFirma.json();

    // Extraer todos los mensajes posibles
    const msgsList = [];
    if (Array.isArray(resultFirma.detalles?.mensajes)) msgsList.push(...resultFirma.detalles.mensajes);
    if (Array.isArray(resultFirma.infoRecepcion?.mensajes)) msgsList.push(...resultFirma.infoRecepcion.mensajes);
    if (resultFirma.autorizacion?.mensaje) {
      const aMsg = resultFirma.autorizacion.mensaje;
      if (typeof aMsg === 'string') msgsList.push(aMsg);
      else if (Array.isArray(aMsg)) {
        aMsg.forEach(m => msgsList.push(typeof m === 'string' ? m : `${m.mensaje || ''}${m.informacionAdicional ? ' - ' + m.informacionAdicional : ''}`));
      }
    }
    const msgsTextFull = msgsList.filter(Boolean).join(' | ');

    // 3. Determinar estado y registrar en la BD
    let estadoSRI = 'RECHAZADO';
    let mensajeRes = msgsTextFull || resultFirma.message || resultFirma.mensaje || (typeof resultFirma === 'string' ? resultFirma : 'Error en proceso SRI');
    const fullText = JSON.stringify(resultFirma || {});

    if (/LIMITE DE INTENTOS/i.test(fullText)) {
      estadoSRI = 'RECHAZADO';
      mensajeRes = msgsTextFull || 'LIMITE DE INTENTOS NO AUTORIZADOS POR DIA';
    } else if (/Invalid password|PKCS#12 MAC could not be verified|serial\/tipo del certificado/i.test(fullText)) {
      estadoSRI = 'RECHAZADO';
      mensajeRes = 'La contraseña de la firma (.p12) no es correcta. Por favor configure bien la clave de la firma en la empresa.';
    } else if (/ERROR SECUENCIAL REGISTRADO|CLAVE ACCESO REGISTRADA|CLAVE DE ACCESO REGISTRADA/i.test(fullText)) {
      estadoSRI = 'AUTORIZADO';
      mensajeRes = 'Comprobante autorizado por el SRI (Clave de acceso/secuencial ya registrado previamente)';
    } else if (resultFirma.success) {
      if (resultFirma.estado === 'RECIBIDA') {
        estadoSRI = 'RECIBIDA';
        mensajeRes = resultFirma.message || resultFirma.mensaje || 'Comprobante recibido, pendiente de autorización';
      } else if (resultFirma.estado === 'DEVUELTA') {
        estadoSRI = 'DEVUELTA';
        mensajeRes = msgsTextFull || 'DEVUELTA por el SRI';
      } else {
        estadoSRI = 'AUTORIZADO';
        mensajeRes = 'Comprobante autorizado por el SRI';
      }
    } else {
      if (resultFirma.autorizacion) {
        estadoSRI = resultFirma.autorizacion.estado || 'RECHAZADO';
        mensajeRes = msgsTextFull || resultFirma.autorizacion.mensaje || resultFirma.autorizacion.infoAdicional || resultFirma.message || resultFirma.mensaje;
      }
    }

    const esAutorizado = estadoSRI === 'AUTORIZADO';
    console.log(`[FacturasService reenviarSri] ➡️ Registrando estado final id_factura=${id_factura}:`, { estadoSRI, mensajeRes });
    try {
      const resReg = await FacturasService.autorizarFactura(id_factura, estadoSRI, mensajeRes);
      console.log(`[FacturasService reenviarSri] ✅ Respuesta registrarAutorizacion:`, resReg);
    } catch (eReg) {
      console.warn(`[FacturasService reenviarSri] ⚠️ registrarAutorizacion no disponible o falló:`, eReg.message);
    }
    return { success: esAutorizado, estado: estadoSRI, mensaje: mensajeRes, resultFirma };
  }
};
