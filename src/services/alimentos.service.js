import { api as axios } from '../config/axios';

const BASE_URL = '/alimentos';

export const getAlimentos = async (params) => {
  try {
    const response = await axios.get(`${BASE_URL}/listar`, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching alimentos:', error);
    throw error;
  }
};

export const createAlimento = async (data) => {
  try {
    const response = await axios.post(`${BASE_URL}/insertar`, data);
    return response.data;
  } catch (error) {
    console.error('Error creating alimento:', error);
    throw error;
  }
};

export const updateAlimento = async (data) => {
  try {
    const response = await axios.post(`${BASE_URL}/actualizar`, data);
    return response.data;
  } catch (error) {
    console.error('Error updating alimento:', error);
    throw error;
  }
};

export const deleteAlimento = async (id) => {
  try {
    // El backend espera POST /alimentos/eliminar { id_alimentos }
    const response = await axios.post(`${BASE_URL}/eliminar`, { id_alimentos: id });
    return response.data;
  } catch (error) {
    console.error('Error deleting alimento:', error);
    throw error;
  }
};
