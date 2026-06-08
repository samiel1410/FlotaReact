import { api } from '../config/axios';

/**
 * Servicio para la gestión de Seguimiento de Guías.
 * Endpoints del backend montados en /seguimiento/
 */
export const SeguimientoService = {
  /**
   * Buscar guías por número de guía para seguimiento
   * GET /seguimiento/buscarGuiaSeguimineto?guia=...
   */
  async buscarGuiaSeguimineto(guia) {
    const response = await api.get(`/seguimiento/buscarGuiaSeguimineto?guia=${encodeURIComponent(guia)}`);
    return response.data;
  },

  /**
   * Eliminar un seguimiento (solo estado ENTREGADO)
   * GET /seguimiento/eliminarSeguimientoEntregado?id_seguimiento=...
   */
  async eliminarSeguimientoEntregado(id_seguimiento) {
    const response = await api.get(`/seguimiento/eliminarSeguimientoEntregado?id_seguimiento=${id_seguimiento}`);
    return response.data;
  },

  /**
   * Obtener seguimientos por ID de guía (usado en el modal)
   * GET /seguimiento/seguimientosxguiaselect?id=...&limit=...&page=...
   */
  async seguimientosxguiaselect(id, limit = 100, page = 1) {
    const response = await api.get(`/seguimiento/seguimientosxguiaselect?id=${id}&limit=${limit}&page=${page}`);
    return response.data;
  },
};
