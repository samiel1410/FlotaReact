import { api as axios } from '../config/axios';

const BASE_URL = '/canton';
const LOCACION_URL = '/locacion';

export const getCantones = async (params) => {
  try {
    const response = await axios.get(`${BASE_URL}/cantonSeleccionPaginado`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching cantones:', error);
    throw error;
  }
};

export const createCanton = async (data) => {
  try {
    const response = await axios.post(`${BASE_URL}/cantonInsertarActualizar`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating canton:', error);
    throw error;
  }
};

export const updateCanton = async (data) => {
  try {
    const response = await axios.post(`${BASE_URL}/cantonInsertarActualizar`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating canton:', error);
    throw error;
  }
};

export const deleteCanton = async (id) => {
  try {
    // Asumiendo un endpoint para eliminar, si no existe, se deberá crear en el backend
    const response = await axios.delete(`${BASE_URL}/eliminarCanton/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting canton:', error);
    throw error;
  }
};

export const getProvincias = async () => {
  try {
    const response = await axios.get(`${LOCACION_URL}/seleccionarProvincia`);
    return response.data.data;
  } catch (error) {
    console.error('Error fetching provincias:', error);
    throw error;
  }
};
