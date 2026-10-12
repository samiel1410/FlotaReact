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

  /**
   * Ubica una guía activa por su número (XXX-XXX-XXXXXXXXX) para registrar seguimiento.
   * GET /seguimiento/buscarGuiaParaSeguimiento?guia=...
   */
  async buscarGuiaParaSeguimiento(guia) {
    const response = await api.get(`/seguimiento/buscarGuiaParaSeguimiento?guia=${encodeURIComponent(guia)}`);
    return response.data;
  },

  /**
   * Registra CHECKING (estado 1) o FINALIZAR (estado 2) sobre una guía.
   * Reutiliza el mismo endpoint que la app móvil; idBus y destino solo se envían en CHECKING.
   * POST /guia/insertarSeguimientoGuia
   */
  async insertarSeguimientoGuia({ idGuia, observacion = '', estado, idUsuario, ubicacion = '', idOficina = '', idBus = null, destino = null }) {
    const response = await api.post('/guia/insertarSeguimientoGuia', {
      id_guia: idGuia,
      observacion,
      estado,
      id_usuario: idUsuario,
      ubicacion,
      id_oficina: idOficina,
      ...(estado === 1 ? { id_bus: idBus, destino } : {}),
    });
    return response.data;
  },
};
