import { api } from '../config/axios';

class CobrosService {
  // ─── DEUDAS ───────────────────────────────────────────────
  async listarDeudas(params = {}) {
    try {
      const res = await api.get('/deuda/listar', { params });
      return { success: true, data: res.data?.data || [], total: res.data?.total || 0 };
    } catch (error) {
      return { success: false, data: [], total: 0, message: error.response?.data?.error || 'Error al cargar deudas' };
    }
  }

  async carteraSocio(params) {
    try {
      const res = await api.get('/deuda/carteraSocio', { params });
      return { success: res.data?.success, data: res.data?.data || [], resumen: res.data?.resumen || [], total_pendiente: res.data?.total_pendiente || 0, info: res.data?.info || {} };
    } catch (error) {
      return { success: false, data: [], resumen: [], total_pendiente: 0, info: {}, message: error.response?.data?.error || 'Error al consultar cartera' };
    }
  }

  async agregarDeuda(data) {
    try {
      const res = await api.post('/deuda/agregar', data);
      return { success: res.data?.success, data: res.data?.data, message: res.data?.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Error al crear deuda' };
    }
  }

  async pagarDeuda(data) {
    try {
      const res = await api.post('/deuda/pagar', data);
      return { success: res.data?.success, data: res.data?.data, message: res.data?.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Error al pagar' };
    }
  }

  async generarCuotaMensual(data) {
    try {
      const res = await api.post('/deuda/generarCuotaMensual', data);
      return { success: res.data?.success, data: res.data?.data, message: res.data?.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Error al generar cuota' };
    }
  }

  async anularDeuda(data) {
    try {
      const res = await api.post('/deuda/anular', data);
      return { success: res.data?.success, message: res.data?.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Error al anular' };
    }
  }

  // ─── MULTAS ───────────────────────────────────────────────
  async getTiposMulta() {
    try {
      const res = await api.get('/multa/tipos');
      return { success: true, data: res.data?.data || [] };
    } catch (error) {
      return { success: false, data: [] };
    }
  }

  async agregarMulta(data) {
    try {
      const res = await api.post('/multa/agregar', data);
      return { success: res.data?.success, data: res.data?.data, message: res.data?.message, notificacion: res.data?.notificacion };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Error al crear multa' };
    }
  }

  async listarMultas(params = {}) {
    try {
      const res = await api.get('/multa/listar', { params });
      return { success: true, data: res.data?.data || [], total: res.data?.total || 0 };
    } catch (error) {
      return { success: false, data: [], total: 0 };
    }
  }

  // ─── CRÉDITOS ─────────────────────────────────────────────
  async agregarCredito(data) {
    try {
      const res = await api.post('/credito/agregar', data);
      return { success: res.data?.success, data: res.data?.data, message: res.data?.message, notificacion: res.data?.notificacion };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Error al crear crédito' };
    }
  }

  async listarCreditos(params = {}) {
    try {
      const res = await api.get('/credito/listar', { params });
      return { success: true, data: res.data?.data || [], total: res.data?.total || 0 };
    } catch (error) {
      return { success: false, data: [], total: 0 };
    }
  }

  // ─── BONOS ────────────────────────────────────────────────
  async agregarBono(data) {
    try {
      const res = await api.post('/bono/agregar', data);
      return { success: res.data?.success, data: res.data?.data, ticket: res.data?.data?.ticket, message: res.data?.message || res.data?.error, notificacion: res.data?.notificacion };
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Error al crear bono';
      return { success: false, message: msg };
    }
  }

  async listarBonos(params = {}) {
    try {
      const res = await api.get('/bono/listar', { params });
      return { success: true, data: res.data?.data || [], total: res.data?.total || 0 };
    } catch (error) {
      return { success: false, data: [], total: 0 };
    }
  }

  async anularBono(data) {
    try {
      const res = await api.post('/bono/anular', data);
      return { success: res.data?.success, message: res.data?.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Error al anular' };
    }
  }

  // ─── REPORTES ─────────────────────────────────────────────
  async cierrePorConcepto(params) {
    try {
      const res = await api.get('/reporte-cobros/cierrePorConcepto', { params });
      return { success: res.data?.success, data: res.data?.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Error al obtener reporte' };
    }
  }
}

export const cobrosService = new CobrosService();
export default cobrosService;
