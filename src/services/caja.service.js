import { api } from '../config/axios';

class CajaService {
  async listadoCaja(params = {}) {
    try {
      const response = await api.get('/caja/listadoCaja', { params });
      return { success: true, data: response.data?.data || [], total: response.data?.total || 0, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, data: [], total: 0, message: error.response?.data?.message || 'Error al cargar cajas' };
    }
  }

  async insertarAperturaCaja(data) {
    try {
      const response = await api.post('/caja/insertarAperturaCaja', data);
      const backendSuccess = response.data?.success !== false;
      return { success: backendSuccess, data: response.data, id_caja: response.data?.id_caja || null, message: response.data?.message || response.data?.mensaje || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al aperturar caja' };
    }
  }

  async cerrarCaja(data) {
    try {
      const response = await api.post('/caja/cerrarCaja', data);
      return {
        success: true,
        data: response.data,
        estado_cuadre: response.data?.estado_cuadre || '',
        valor_diferencia: response.data?.valor_diferencia || 0,
        message: response.data?.message || ''
      };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al cerrar caja' };
    }
  }

  async validarCaja() {
    try {
      const response = await api.post('/caja/validarcaja');
      return { success: true, data: response.data?.data || null, id_caja: response.data?.id_caja || null, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, data: null, id_caja: null, message: error.response?.data?.message || 'Error al validar caja' };
    }
  }

  async guardarInfoComprobante(data) {
    try {
      const response = await api.post('/caja/guardarInfoComprobante', data);
      return { success: response.data?.success, data: response.data, message: response.data?.mensaje || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al guardar' };
    }
  }

  async arqueoCajaPdf(idCaja) {
    try {
      const response = await api.get('/caja/arqueoCajaPdf', { params: { id_caja: idCaja } });
      return { success: true, url: response.data?.url || '', data: response.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error' };
    }
  }

  async informacionCaja(idCaja) {
    try {
      const response = await api.get('/caja/informacionCaja', { params: { id_caja: idCaja } });
      return { success: true, data: response.data?.data || [], message: response.data?.message || '' };
    } catch (error) {
      return { success: false, data: [], message: error.response?.data?.message || 'Error' };
    }
  }

  async listadoDetalleCaja(idCaja) {
    try {
      const response = await api.get('/caja/listadodetallecaja', { params: { id_caja: idCaja, limit: 200 } });
      return { success: true, data: response.data?.data || [], total: response.data?.total || 0 };
    } catch (error) {
      return { success: false, data: [], message: error.response?.data?.message || 'Error' };
    }
  }

  async detalleCaja(data) {
    try {
      const response = await api.post('/caja/detallecaja', data);
      return { success: response.data?.success, data: response.data, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al guardar detalle' };
    }
  }

  async eliminarDetalleCaja(idDetalle) {
    try {
      const response = await api.post('/caja/eliminarDetalleCaja', { id_caja_detalle: idDetalle });
      return { success: response.data?.success, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error' };
    }
  }

  async solicitudAnulacion(data) {
    try {
      const response = await api.post('/caja/solicitudAnulacion', data);
      return { success: response.data?.success, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error' };
    }
  }

  async enviarSolicitudEdicion(idCaja) {
    try {
      const response = await api.get('/caja/enviarSolicituEdicion', { params: { id_caja: idCaja } });
      return { success: response.data?.success, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error' };
    }
  }

  async aprobarSolicitud(idCaja) {
    try {
      const response = await api.post('/caja/aprobarSolicitud', { id_caja: idCaja });
      return { success: response.data?.success, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error' };
    }
  }

  async verificarCuadreCaja(idCaja) {
    try {
      const response = await api.get('/caja/verificarCuadreCaja', { params: { id_caja: idCaja } });
      return { success: response.data?.success, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error' };
    }
  }

  async editarCaja(data) {
    try {
      const response = await api.post('/caja/editarCaja', data);
      return { success: response.data?.success, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al editar caja' };
    }
  }
}

export default new CajaService();
