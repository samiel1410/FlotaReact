import { api } from '../config/axios';

/**
 * Servicio del módulo de Promesas de Pago (cuota administrativa).
 */
class PromesaPagoService {
  async listar(params = {}) {
    try {
      const res = await api.get('/promesa-pago/listado', { params });
      return {
        success: res.data?.success !== false,
        data: res.data?.data || [],
        total: res.data?.total || 0,
        config: res.data?.config || null,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        total: 0,
        message: error.response?.data?.error || 'Error al cargar promesas de pago',
      };
    }
  }

  async porCobrar(params = {}) {
    try {
      const res = await api.get('/promesa-pago/porCobrar', { params });
      return {
        success: res.data?.success !== false,
        data: res.data?.data || [],
        resumen: res.data?.resumen || { vencidas: 0, hoy: 0, proximas: 0, total_cobrar: 0, cantidad: 0 },
        config: res.data?.config || null,
      };
    } catch (error) {
      return {
        success: false,
        data: [],
        resumen: { vencidas: 0, hoy: 0, proximas: 0, total_cobrar: 0, cantidad: 0 },
        message: error.response?.data?.error || 'Error al cargar promesas por cobrar',
      };
    }
  }

  async detalle(id) {
    try {
      const res = await api.get(`/promesa-pago/detalle/${id}`);
      return { success: res.data?.success !== false, data: res.data?.data || null };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Error al cargar el detalle' };
    }
  }

  async crear(data) {
    try {
      const res = await api.post('/promesa-pago/crear', data);
      return { success: res.data?.success !== false, data: res.data?.data, message: res.data?.message };
    } catch (error) {
      const payload = error.response?.data || {};
      return { success: false, message: payload.error || payload.message || 'Error al crear la promesa' };
    }
  }

  async pagar(data) {
    try {
      const res = await api.post('/promesa-pago/pagar', data);
      return { success: res.data?.success !== false, data: res.data?.data, message: res.data?.message };
    } catch (error) {
      const payload = error.response?.data || {};
      return { success: false, message: payload.error || payload.message || 'Error al registrar el pago', requiere_caja: payload.requiere_caja === true };
    }
  }

  async anular(data) {
    try {
      const res = await api.post('/promesa-pago/anular', data);
      return { success: res.data?.success !== false, message: res.data?.message };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Error al anular la promesa' };
    }
  }

  async busesDisponibles(params = {}) {
    try {
      const res = await api.get('/promesa-pago/busesDisponibles', { params });
      return { success: res.data?.success !== false, data: res.data?.data || [], config: res.data?.config || null };
    } catch (error) {
      return { success: false, data: [], message: error.response?.data?.error || 'Error al cargar buses' };
    }
  }

  async procesarVencidas() {
    try {
      const res = await api.post('/promesa-pago/procesarVencidas');
      return { success: res.data?.success !== false, data: res.data?.data };
    } catch (error) {
      return { success: false, message: error.response?.data?.error || 'Error al procesar vencidas' };
    }
  }
}

export const promesaPagoService = new PromesaPagoService();
export default promesaPagoService;
