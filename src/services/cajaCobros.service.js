import { api } from '../config/axios';

class CajaCobrosService {
  async listadoCaja(params = {}) {
    try {
      const response = await api.get('/cajaretenciones/listadoCaja', { params });
      return { success: true, data: response.data?.data || [], total: response.data?.total || 0 };
    } catch (error) {
      return { success: false, data: [], total: 0, message: error.response?.data?.message || 'Error al cargar' };
    }
  }

  async insertarAperturaCaja(data) {
    try {
      const response = await api.post('/cajaretenciones/insertarAperturaCaja', data);
      return { success: response.data?.success, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al aperturar' };
    }
  }

  async cerrarCaja(data) {
    try {
      const response = await api.post('/cajaretenciones/cerrarCaja', data);
      return {
        success: response.data?.success,
        estado_cuadre: response.data?.estado_cuadre || '',
        valor_diferencia: response.data?.valor_diferencia || 0,
        message: response.data?.message || ''
      };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al cerrar' };
    }
  }

  async validarCaja() {
    try {
      const response = await api.post('/cajaretenciones/validarcaja');
      return { success: true, data: response.data?.data || null };
    } catch (error) {
      return { success: false, data: null };
    }
  }

  async guardarInfoComprobante(data) {
    try {
      const response = await api.post('/cajaretenciones/guardarInfoComprobante', data);
      return { success: response.data?.success, message: response.data?.mensaje || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error' };
    }
  }

  async informacionCaja(idCaja) {
    try {
      const response = await api.get('/cajaretenciones/informacionCaja', { params: { id_caja: idCaja } });
      return { success: true, data: response.data?.data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  }

  async listadoDetalleCaja(idCaja) {
    try {
      const response = await api.get('/cajaretenciones/listadodetallecaja', { params: { id_caja: idCaja, limit: 200 } });
      return { success: true, data: response.data?.data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  }

  async detalleCaja(data) {
    try {
      const response = await api.post('/cajaretenciones/detallecaja', data);
      return { success: response.data?.success, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al guardar' };
    }
  }

  async eliminarDetalleCaja(idDetalle) {
    try {
      const response = await api.post('/cajaretenciones/eliminarDetalleCaja', { id_caja_detalle: idDetalle });
      return { success: response.data?.success, message: '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error' };
    }
  }

  async solicitudAnulacion(data) {
    try {
      const response = await api.post('/cajaretenciones/solicitudAnulacion', data);
      return { success: response.data?.success };
    } catch (error) {
      return { success: false };
    }
  }

  async enviarSolicitudEdicion(idCaja) {
    try {
      const response = await api.get('/cajaretenciones/enviarSolicituEdicion', { params: { id_caja: idCaja } });
      return { success: response.data?.success };
    } catch (error) {
      return { success: false };
    }
  }

  async aprobarSolicitud(idCaja) {
    try {
      const response = await api.post('/cajaretenciones/aprobarSolicitud', { id_caja: idCaja });
      return { success: response.data?.success };
    } catch (error) {
      return { success: false };
    }
  }

  async arqueoCajaPdf(idCaja) {
    try {
      await api.get('/cajaretenciones/arqueoCajaPdf', { params: { id_caja: idCaja } });
      return { success: true, url: `/cajaretenciones/arqueoCajaPdf?id_caja=${idCaja}` };
    } catch (error) {
      return { success: false };
    }
  }
}

export const cajaCobrosService = new CajaCobrosService();
export default cajaCobrosService;
