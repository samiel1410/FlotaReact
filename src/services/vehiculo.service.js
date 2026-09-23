import { api } from '../config/axios';

export const vehiculoService = {
  // Listar vehículos paginados
  async listar(params = {}) {
    const response = await api.get('/vehiculo/seleccionarVehiculos', { params });
    return response.data;
  },

  // Combo de vehículos activos
  async combo(params = {}) {
    const response = await api.get('/vehiculo/comboVehiculos', { params });
    return response.data;
  },

  // Guardar (insertar/actualizar)
  async guardar(data) {
    const response = await api.post('/vehiculo/insertarActualizarVehiculo', data);
    return response.data;
  },

  // Eliminar
  async eliminar(id_vehiculo) {
    const response = await api.post('/vehiculo/eliminarVehiculo', { id_vehiculo });
    return response.data;
  }
};
