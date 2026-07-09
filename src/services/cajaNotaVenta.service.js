import { api } from '../config/axios';

class CajaNotaVentaService {
  async listadoCaja(params = {}) {
    try {
      const response = await api.get('/caja_nota_venta/listadoCaja', { params });
      return { success: true, data: response.data?.data || [], total: response.data?.total || 0, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, data: [], total: 0, message: error.response?.data?.message || 'Error al cargar cajas' };
    }
  }

  async insertarAperturaCaja(data) {
    try {
      const response = await api.post('/caja_nota_venta/insertarAperturaCaja', data);
      return { success: true, data: response.data, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al aperturar caja' };
    }
  }

  async cerrarCaja(data) {
    try {
      const response = await api.post('/caja_nota_venta/cerrarCaja', data);
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
      const response = await api.post('/caja_nota_venta/validarcaja');
      return { success: true, data: response.data?.data || null, id_caja: response.data?.id_caja || null, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, data: null, message: error.response?.data?.message || 'Error al validar caja' };
    }
  }

  async guardarInfoComprobante(data) {
    try {
      const response = await api.post('/caja_nota_venta/guardarInfoComprobante', data);
      return { success: response.data?.success, data: response.data, message: response.data?.mensaje || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al guardar' };
    }
  }

  async informacionCaja(idCaja) {
    try {
      const response = await api.get('/caja_nota_venta/informacionCaja', { params: { id_caja: idCaja } });
      return { success: true, data: response.data?.data || [], message: response.data?.message || '' };
    } catch (error) {
      return { success: false, data: [], message: error.response?.data?.message || 'Error' };
    }
  }

  async listadoDetalleCaja(idCaja) {
    try {
      const response = await api.get('/caja_nota_venta/listadodetallecaja', { params: { id_caja: idCaja, limit: 200 } });
      return { success: true, data: response.data?.data || [], total: response.data?.total || 0 };
    } catch (error) {
      return { success: false, data: [], message: error.response?.data?.message || 'Error' };
    }
  }

  async detalleCaja(data) {
    try {
      const response = await api.post('/caja_nota_venta/detallecaja', data);
      return { success: response.data?.success, data: response.data, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error al guardar detalle' };
    }
  }

  async eliminarDetalleCaja(idDetalle) {
    try {
      const response = await api.post('/caja_nota_venta/eliminarDetalleCaja', { id_caja_detalle: idDetalle });
      return { success: response.data?.success, message: response.data?.message || '' };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Error' };
    }
  }
}

export default new CajaNotaVentaService();
