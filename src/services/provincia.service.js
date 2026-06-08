import { api as axios } from '../config/axios';

const BASE_URL = '/provincia';

export const getProvincias = async (params) => {
  try {
    const response = await axios.get(`${BASE_URL}/provinciaSeleccionPaginado`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching provincias:', error);
    throw error;
  }
};

export const createProvincia = async (data) => {
  try {
    const response = await axios.post(`${BASE_URL}/provinciaInsertarActualizar`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating provincia:', error);
    throw error;
  }
};

export const updateProvincia = async (data) => {
  try {
    const response = await axios.post(`${BASE_URL}/provinciaInsertarActualizar`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating provincia:', error);
    throw error;
  }
};

export const deleteProvincia = async (id) => {
  try {
    // Asumiendo un endpoint para eliminar, si no existe, se deberá crear en el backend
    const response = await axios.delete(`${BASE_URL}/eliminarProvincia/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting provincia:', error);
    throw error;
  }
};
